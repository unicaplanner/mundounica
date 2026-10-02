import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma, tabela } from "@/lib/db";
import { buscarProdutosShopify, buscarVariantesShopify } from "./shopify";

const LOTE = 300;

// Atualiza produtos e variantes vindos do Shopify. Nunca mexe em tipo,
// custo ou composicao -- isso e preenchido aqui e o Shopify nao sabe. Vai
// em lotes (um INSERT ... ON CONFLICT por lote) porque gravar centenas de
// linhas uma por uma leva minutos.
export async function sincronizarProdutos(): Promise<{ produtos: number; variantes: number }> {
  const [produtos, variantes] = await Promise.all([buscarProdutosShopify(), buscarVariantesShopify()]);

  const tabelaProduto = Prisma.raw(tabela("Produto"));
  for (let i = 0; i < produtos.length; i += LOTE) {
    const lote = produtos.slice(i, i + LOTE);
    await prisma.$executeRaw`
      INSERT INTO ${tabelaProduto}
        ("id", "shopifyProductId", "title", "status", "url", "lastSyncedAt", "createdAt", "updatedAt")
      SELECT t.id, t.sp, t.title, t.status, t.url, now(), now(), now()
      FROM unnest(
        ${lote.map(() => randomUUID())}::text[], ${lote.map((p) => p.id)}::text[],
        ${lote.map((p) => p.title)}::text[], ${lote.map((p) => p.status)}::text[],
        ${lote.map((p) => p.onlineStoreUrl)}::text[]
      ) AS t(id, sp, title, status, url)
      ON CONFLICT ("shopifyProductId") DO UPDATE SET
        "title" = EXCLUDED."title",
        "status" = EXCLUDED."status",
        "url" = EXCLUDED."url",
        "lastSyncedAt" = now(),
        "updatedAt" = now()
    `;
  }

  const idPorShopify = new Map(
    (await prisma.produto.findMany({ select: { id: true, shopifyProductId: true } })).map((p) => [
      p.shopifyProductId,
      p.id,
    ])
  );
  const comProduto = variantes.filter((v) => idPorShopify.has(v.product.id));

  const tabelaVariante = Prisma.raw(tabela("Variante"));
  for (let i = 0; i < comProduto.length; i += LOTE) {
    const lote = comProduto.slice(i, i + LOTE);
    await prisma.$executeRaw`
      INSERT INTO ${tabelaVariante}
        ("id", "shopifyVariantId", "produtoId", "title", "sku", "preco", "posicao", "ativa",
         "lastSyncedAt", "createdAt", "updatedAt")
      SELECT t.id, t.sv, t.pid, t.title, t.sku, t.preco, t.posicao, true, now(), now(), now()
      FROM unnest(
        ${lote.map(() => randomUUID())}::text[], ${lote.map((v) => v.id)}::text[],
        ${lote.map((v) => idPorShopify.get(v.product.id)!)}::text[], ${lote.map((v) => v.title)}::text[],
        ${lote.map((v) => v.sku || null)}::text[], ${lote.map((v) => v.price)}::numeric[],
        ${lote.map((v) => v.position)}::int[]
      ) AS t(id, sv, pid, title, sku, preco, posicao)
      ON CONFLICT ("shopifyVariantId") DO UPDATE SET
        "produtoId" = EXCLUDED."produtoId",
        "title" = EXCLUDED."title",
        "sku" = EXCLUDED."sku",
        "preco" = EXCLUDED."preco",
        "posicao" = EXCLUDED."posicao",
        "ativa" = true,
        "lastSyncedAt" = now(),
        "updatedAt" = now()
    `;
  }

  // Variante que nao veio mais do Shopify fica inativa (nao e apagada: pode
  // estar dentro de algum kit). So roda se o Shopify devolveu variantes, pra
  // uma resposta vazia por erro nunca desativar tudo.
  if (comProduto.length > 0) {
    await prisma.variante.updateMany({
      where: { shopifyVariantId: { notIn: comProduto.map((v) => v.id) }, ativa: true },
      data: { ativa: false },
    });
  }

  return { produtos: produtos.length, variantes: comProduto.length };
}
