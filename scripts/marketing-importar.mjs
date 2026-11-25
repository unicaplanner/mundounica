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

// Por padrao so CRIA o que ainda nao existe: o que a Lari ja editou, remarcou
// ou arquivou pela tela nao e reescrito. Pra reescrever a partir do JSON:
//   node scripts/marketing-importar.mjs --atualizar [arquivos]
// (prefira o "Importar plano" da tela, que mostra a previa antes.)
const ATUALIZAR = process.argv.includes("--atualizar");
const PASTA = "marketing/lotes";
const pedidos = process.argv.slice(2).filter((a) => a !== "--atualizar");
const arquivos = pedidos.length ? pedidos : readdirSync(PASTA).filter((a) => a.endsWith(".json")).sort().map((a) => join(PASTA, a));

const dia = (iso) => new Date(`${iso}T00:00:00Z`);
const CAMPOS = ["horario", "formato", "pilar", "campanha", "titulo", "objetivo", "gancho", "legenda", "cta", "hashtags", "producao", "produtos", "reaproveita", "observacao", "perfil"];

console.log(`Schema: ${schema}`);

for (const arquivo of arquivos) {
  const json = JSON.parse(readFileSync(arquivo, "utf8"));

  for (const l of json.lotes ?? []) {
    const dados = { titulo: l.titulo, foco: l.foco ?? null, inicio: dia(l.inicio), fim: dia(l.fim) };
    await prisma.mktLote.upsert({ where: { numero: l.numero }, create: { numero: l.numero, ...dados }, update: dados });
  }

  // Campanhas (so cria; a Lari edita na tela) e datas da marca.
  for (const c of json.campanhas ?? []) {
    if (await prisma.mktCampanha.findUnique({ where: { codigo: c.codigo } })) continue;
    const n = (k) => (c[k] === undefined || c[k] === null || c[k] === "" ? null : Number(c[k]));
    await prisma.mktCampanha.create({ data: { codigo: c.codigo, nome: c.nome, descricao: c.descricao ?? null, oferta: c.oferta ?? null, descontoPct: n("descontoPct"), cupom: c.cupom ?? null, brinde: c.brinde ?? null, brindeQtd: n("brindeQtd"), quantidade: n("quantidade"), freteGratisAcima: n("freteGratisAcima"), produtos: c.produtos ?? null, inicio: c.inicio ? dia(c.inicio) : null, fim: c.fim ? dia(c.fim) : null, prazoProducaoDias: n("prazoProducaoDias"), ultimoDiaPedido: c.ultimoDiaPedido ? dia(c.ultimoDiaPedido) : null, prazosRegiao: c.prazosRegiao ?? undefined } });
  }
  for (const d of json.datas ?? []) {
    const dados = { titulo: d.titulo, tipo: d.tipo ?? "marca", inicio: dia(d.inicio), fim: d.fim ? dia(d.fim) : null, nota: d.nota ?? null, recorrente: d.recorrente === true };
    await prisma.mktData.upsert({ where: { codigo: d.codigo }, create: { codigo: d.codigo, ...dados }, update: dados });
  }

  if (json.lote === undefined) {
    console.log(`${arquivo}: ${json.lotes?.length ?? 0} lotes, ${json.campanhas?.length ?? 0} campanhas, ${json.datas?.length ?? 0} datas`);
    continue;
  }

  const lote = await prisma.mktLote.findUnique({ where: { numero: json.lote } });
  if (!lote) throw new Error(`${arquivo}: o lote ${json.lote} nao existe (rode o 00-lotes.json antes).`);

  let novos = 0;
  let atualizados = 0;
  for (const c of json.conteudos ?? []) {
    const dados = { loteId: lote.id, data: dia(c.data), canal: c.canal, nivel: c.nivel, roteiro: c.roteiro ?? null };
    // "arquivado": true tira do calendario e das tarefas sem apagar (guarda a data da 1a vez).
    if (c.arquivado) dados.arquivadoEm = (await prisma.mktConteudo.findUnique({ where: { codigo: c.codigo }, select: { arquivadoEm: true } }))?.arquivadoEm ?? new Date();
    // So desarquiva se o JSON pedir ("arquivado": false); arquivado pela tela fica arquivado.
    else if (c.arquivado === false) dados.arquivadoEm = null;
    for (const k of CAMPOS) dados[k] = c[k] ?? null;
    // O link do Canva tambem pode ser colado pela tela: o JSON so troca se trouxer um.
    if (c.linkCanva) dados.linkCanva = c.linkCanva;
    if (c.campanhaCodigo) dados.campanhaId = (await prisma.mktCampanha.findUnique({ where: { codigo: c.campanhaCodigo }, select: { id: true } }))?.id ?? null;

    const atual = await prisma.mktConteudo.findUnique({ where: { codigo: c.codigo }, select: { status: true } });
    if (!atual) {
      await prisma.mktConteudo.create({ data: { codigo: c.codigo, ...dados, status: c.status ?? "roteiro" } });
      novos++;
    } else if (!ATUALIZAR) {
      continue;
    } else {
      const reescrito = atual.status === "ajustar" ? { status: "roteiro", notaLari: null, statusEm: new Date() } : {};
      // forcarStatus: replanejamento decidido pela Lari (ex: ja foi postado).
      // Nunca desfaz um "Postei": publicado so muda pela tela.
      const forcado = c.forcarStatus && c.forcarStatus !== atual.status && atual.status !== "publicado" ? { status: c.forcarStatus, statusEm: new Date() } : {};
      await prisma.mktConteudo.update({ where: { codigo: c.codigo }, data: { ...dados, ...reescrito, ...forcado } });
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
    if (t.arquivado) dados.arquivadoEm = (await prisma.mktTarefa.findUnique({ where: { codigo: t.codigo }, select: { arquivadoEm: true } }))?.arquivadoEm ?? new Date();
    // So desarquiva se o JSON pedir ("arquivado": false); arquivado pela tela fica arquivado.
    else if (t.arquivado === false) dados.arquivadoEm = null;
    if (!ATUALIZAR && (await prisma.mktTarefa.findUnique({ where: { codigo: t.codigo }, select: { id: true } }))) continue;
    await prisma.mktTarefa.upsert({ where: { codigo: t.codigo }, create: { codigo: t.codigo, ...dados }, update: dados });
  }

  console.log(`${arquivo}: ${novos} conteudos novos, ${atualizados} atualizados, ${json.tarefas?.length ?? 0} tarefas`);
}

await prisma.$disconnect();
