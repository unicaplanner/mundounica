import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma, tabela } from "@/lib/db";
import { buscarProdutosShopify } from "./shopify";

// Atualiza titulo/status/link de todos os produtos do Shopify. Nunca mexe
// em tipo, custoCompra ou ficha tecnica -- isso e preenchido aqui e o
// Shopify nao sabe. Vai em lotes (um INSERT ... ON CONFLICT por lote)
// porque gravar centenas de produtos um por um leva minutos.
export async function sincronizarProdutos(): Promise<number> {
  const produtos = await buscarProdutosShopify();
  const tabelaProduto = Prisma.raw(tabela("Produto"));
  const LOTE = 300;

  for (let i = 0; i < produtos.length; i += LOTE) {
    const lote = produtos.slice(i, i + LOTE);
    const ids = lote.map(() => randomUUID());
    const shopifyIds = lote.map((p) => p.id);
    const titulos = lote.map((p) => p.title);
    const status = lote.map((p) => p.status);
    const urls = lote.map((p) => p.onlineStoreUrl);

    await prisma.$executeRaw`
      INSERT INTO ${tabelaProduto}
        ("id", "shopifyProductId", "title", "status", "url", "lastSyncedAt", "createdAt", "updatedAt")
      SELECT t.id, t.sp, t.title, t.status, t.url, now(), now(), now()
      FROM unnest(${ids}::text[], ${shopifyIds}::text[], ${titulos}::text[], ${status}::text[], ${urls}::text[])
        AS t(id, sp, title, status, url)
      ON CONFLICT ("shopifyProductId") DO UPDATE SET
        "title" = EXCLUDED."title",
        "status" = EXCLUDED."status",
        "url" = EXCLUDED."url",
        "lastSyncedAt" = now(),
        "updatedAt" = now()
    `;
  }

  return produtos.length;
}
