// Carrega o calendario de conteudo do Marketing a partir dos JSON em
// marketing/lotes/ (00-lotes.json com os lotes; lote-NN.json com conteudos e
// tarefas). Pode rodar quantas vezes quiser: atualiza pelo "codigo".
//
//   node scripts/marketing-importar.mjs                (todos os arquivos)
//   node scripts/marketing-importar.mjs marketing/lotes/lote-02.json
//
// Usa a DATABASE_URL do .env.local (schema de teste). Pra producao:
//   $env:DATABASE_URL="...?schema=financeiro"; node scripts/marketing-importar.mjs
//
// O que a Lari mexe pela tela nunca e sobrescrito: status (aprovado,
// gravado, publicado), link publicado, tarefa feita e a pasta do Drive. So
// um conteudo com "ajuste pedido" volta pra "pra aprovar", porque reimportar
// e justamente entregar o texto reescrito.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const raw = process.env.DATABASE_URL?.trim();
if (!raw) throw new Error("DATABASE_URL nao configurada.");
const url = new URL(raw);
const schema = url.searchParams.get("schema");
if (!schema || schema === "public") throw new Error("DATABASE_URL precisa de ?schema= privado.");
url.searchParams.delete("schema");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString(), max: 2 }, { schema }) });

const PASTA = "marketing/lotes";
const arquivos = process.argv.length > 2 ? process.argv.slice(2) : readdirSync(PASTA).filter((a) => a.endsWith(".json")).sort().map((a) => join(PASTA, a));

const dia = (iso) => new Date(`${iso}T00:00:00Z`);
const CAMPOS = ["horario", "formato", "pilar", "campanha", "titulo", "objetivo", "gancho", "legenda", "cta", "hashtags", "producao", "produtos", "reaproveita", "observacao"];

console.log(`Schema: ${schema}`);

for (const arquivo of arquivos) {
  const json = JSON.parse(readFileSync(arquivo, "utf8"));

  for (const l of json.lotes ?? []) {
    const dados = { titulo: l.titulo, foco: l.foco ?? null, inicio: dia(l.inicio), fim: dia(l.fim) };
    await prisma.mktLote.upsert({ where: { numero: l.numero }, create: { numero: l.numero, ...dados }, update: dados });
  }

  if (json.lote === undefined) {
    console.log(`${arquivo}: ${json.lotes?.length ?? 0} lotes`);
    continue;
  }

  const lote = await prisma.mktLote.findUnique({ where: { numero: json.lote } });
  if (!lote) throw new Error(`${arquivo}: o lote ${json.lote} nao existe (rode o 00-lotes.json antes).`);

  let novos = 0;
  let atualizados = 0;
  for (const c of json.conteudos ?? []) {
    const dados = { loteId: lote.id, data: dia(c.data), canal: c.canal, nivel: c.nivel, roteiro: c.roteiro ?? null };
    for (const k of CAMPOS) dados[k] = c[k] ?? null;

    const atual = await prisma.mktConteudo.findUnique({ where: { codigo: c.codigo }, select: { status: true } });
    if (!atual) {
      await prisma.mktConteudo.create({ data: { codigo: c.codigo, ...dados, status: c.status ?? "roteiro" } });
      novos++;
    } else {
      const reescrito = atual.status === "ajustar" ? { status: "roteiro", notaLari: null, statusEm: new Date() } : {};
      await prisma.mktConteudo.update({ where: { codigo: c.codigo }, data: { ...dados, ...reescrito } });
      atualizados++;
    }
  }

  for (const t of json.tarefas ?? []) {
    const conteudo = t.conteudo ? await prisma.mktConteudo.findUnique({ where: { codigo: t.conteudo }, select: { id: true } }) : null;
    const dados = {
      titulo: t.titulo,
      detalhe: t.detalhe ?? null,
      tipo: t.tipo ?? "outro",
      prazo: t.prazo ? dia(t.prazo) : null,
      link: t.link ?? null,
      linkRotulo: t.linkRotulo ?? null,
      conteudoId: conteudo?.id ?? null,
    };
    await prisma.mktTarefa.upsert({ where: { codigo: t.codigo }, create: { codigo: t.codigo, ...dados }, update: dados });
  }

  console.log(`${arquivo}: ${novos} conteudos novos, ${atualizados} atualizados, ${json.tarefas?.length ?? 0} tarefas`);
}

await prisma.$disconnect();
