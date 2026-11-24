import type { MktStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CANAIS_VALIDOS, comoDia, ehDia } from "./edicao";

// "Importar plano": o mesmo JSON de marketing/lotes (00-lotes.json com
// "lotes", lote-NN.json com "lote", "conteudos" e "tarefas"), colado na
// tela. Primeiro a previa (o que entra, muda e sai), depois gravar, so com
// o OK da Lari. Mesmas regras do scripts/marketing-importar.mjs: o que ela
// marcou na tela (andamento, link publicado, tarefa feita, pasta do Drive)
// nunca e sobrescrito, e um conteudo com ajuste pedido volta pra "pra aprovar".

type Json = Record<string, unknown>;
const CAMPOS = ["horario", "formato", "pilar", "campanha", "titulo", "objetivo", "gancho", "legenda", "cta", "hashtags", "producao", "produtos", "reaproveita", "observacao", "perfil"] as const;
const STATUS_VALIDOS: MktStatus[] = ["ideia", "roteiro", "ajustar", "aprovado", "gravado", "publicado"];

export type Previa = {
  erros: string[];
  lotes: { novos: string[]; mudados: string[] };
  conteudos: {
    novos: { codigo: string; data: string; titulo: string }[];
    mudados: { codigo: string; data: string; titulo: string; campos: string[] }[];
    arquivar: { codigo: string; data: string; titulo: string }[];
    desarquivar: { codigo: string; data: string; titulo: string }[];
  };
  tarefas: { novas: string[]; mudadas: string[]; arquivar: string[] };
};

const texto = (v: unknown) => (v === undefined || v === null || v === "" ? null : String(v));
// O banco (jsonb) reordena as chaves dos objetos: compara sem ligar pra ordem.
function normal(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(normal);
  if (v && typeof v === "object" && !(v instanceof Date)) return Object.fromEntries(Object.keys(v).sort().map((k) => [k, normal((v as Json)[k])]));
  return v ?? null;
}
const igual = (a: unknown, b: unknown) => JSON.stringify(normal(a)) === JSON.stringify(normal(b));
const diaDe = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);

function comoLista(entrada: unknown): Json[] {
  if (Array.isArray(entrada)) return entrada as Json[];
  if (entrada && typeof entrada === "object") return [entrada as Json];
  return [];
}

// Le, valida e compara com o banco. Devolve a previa e a lista de gravacoes.
async function planejar(entrada: unknown) {
  const previa: Previa = {
    erros: [],
    lotes: { novos: [], mudados: [] },
    conteudos: { novos: [], mudados: [], arquivar: [], desarquivar: [] },
    tarefas: { novas: [], mudadas: [], arquivar: [] },
  };
  const ops: ((tx: Prisma.TransactionClient) => Promise<unknown>)[] = [];
  const planos = comoLista(entrada);
  if (!planos.length) previa.erros.push("Não reconheci o plano: cole o JSON de um lote (com \"lote\" e \"conteudos\") ou a lista de lotes.");

  const lotesBanco = await prisma.mktLote.findMany();
  const lotePorNumero = new Map(lotesBanco.map((l) => [l.numero, l]));
  const lotesNovos = new Set<number>();

  for (const p of planos) {
    for (const l of comoLista(p.lotes)) {
      const numero = Number(l.numero);
      if (!Number.isInteger(numero) || !ehDia(l.inicio) || !ehDia(l.fim) || !texto(l.titulo)) {
        previa.erros.push(`Lote ${texto(l.numero) ?? "?"}: precisa de número, título, início e fim (AAAA-MM-DD).`);
        continue;
      }
      const dados = { titulo: String(l.titulo), foco: texto(l.foco), inicio: comoDia(l.inicio), fim: comoDia(l.fim) };
      const atual = lotePorNumero.get(numero);
      if (!atual) {
        previa.lotes.novos.push(`Lote ${numero} · ${dados.titulo}`);
        lotesNovos.add(numero);
      } else if (atual.titulo !== dados.titulo || atual.foco !== dados.foco || diaDe(atual.inicio) !== l.inicio || diaDe(atual.fim) !== l.fim) {
        previa.lotes.mudados.push(`Lote ${numero} · ${dados.titulo}`);
      } else continue;
      ops.push((tx) => tx.mktLote.upsert({ where: { numero }, create: { numero, ...dados }, update: dados }));
    }
  }

  for (const p of planos) {
    if (p.lote === undefined) continue;
    const numero = Number(p.lote);
    if (!lotePorNumero.has(numero) && !lotesNovos.has(numero)) {
      previa.erros.push(`O lote ${numero} não existe: mande junto o cabeçalho dele (como no 00-lotes.json).`);
      continue;
    }

    const conteudos = comoLista(p.conteudos);
    const codigos = conteudos.map((c) => String(c.codigo ?? ""));
    const existentes = new Map((await prisma.mktConteudo.findMany({ where: { codigo: { in: codigos } } })).map((c) => [c.codigo, c]));

    for (const c of conteudos) {
      const codigo = texto(c.codigo);
      const nome = `${texto(c.data) ?? "?"} · ${texto(c.titulo) ?? codigo ?? "sem título"}`;
      if (!codigo || !ehDia(c.data) || !CANAIS_VALIDOS.includes(c.canal as never) || !texto(c.titulo) || !texto(c.formato) || !["realista", "extra"].includes(String(c.nivel))) {
        previa.erros.push(`Conteúdo ${nome}: precisa de codigo, data, canal, nivel, formato e titulo válidos.`);
        continue;
      }
      if (c.status && !STATUS_VALIDOS.includes(c.status as MktStatus)) previa.erros.push(`Conteúdo ${nome}: status "${c.status}" não existe.`);
      if (c.forcarStatus && !STATUS_VALIDOS.includes(c.forcarStatus as MktStatus)) previa.erros.push(`Conteúdo ${nome}: forcarStatus "${c.forcarStatus}" não existe.`);

      const dados: Record<string, unknown> = { data: comoDia(c.data), canal: c.canal, nivel: c.nivel, roteiro: c.roteiro ?? null };
      for (const k of CAMPOS) dados[k] = texto(c[k]);
      if (c.linkCanva) dados.linkCanva = String(c.linkCanva);
      const item = { codigo, data: String(c.data), titulo: String(c.titulo) };
      const atual = existentes.get(codigo);

      if (!atual) {
        previa.conteudos.novos.push(item);
        if (c.arquivado) previa.conteudos.arquivar.push(item);
        ops.push(async (tx) => {
          const lote = await tx.mktLote.findUniqueOrThrow({ where: { numero } });
          return tx.mktConteudo.create({
            data: { codigo, ...(dados as object), loteId: lote.id, status: (c.status as MktStatus) ?? "roteiro", arquivadoEm: c.arquivado ? new Date() : null } as Prisma.MktConteudoUncheckedCreateInput,
          });
        });
        continue;
      }

      const mudou = Object.keys(dados).filter((k) => (k === "data" ? diaDe(atual.data) !== c.data : !igual((atual as Json)[k], dados[k])));
      if (lotePorNumero.get(numero)?.id !== atual.loteId) mudou.push("lote");
      const forcado = c.forcarStatus && c.forcarStatus !== atual.status ? (c.forcarStatus as MktStatus) : null;
      const reescrito = atual.status === "ajustar";
      if (forcado) mudou.push(`status → ${forcado}`);
      else if (reescrito) mudou.push("ajuste reescrito → pra aprovar");
      const arquivar = !!c.arquivado && !atual.arquivadoEm;
      const desarquivar = !c.arquivado && !!atual.arquivadoEm;
      if (arquivar) previa.conteudos.arquivar.push(item);
      if (desarquivar) previa.conteudos.desarquivar.push(item);
      if (!mudou.length && !arquivar && !desarquivar) continue;
      if (mudou.length) previa.conteudos.mudados.push({ ...item, campos: mudou });

      ops.push(async (tx) => {
        const lote = await tx.mktLote.findUniqueOrThrow({ where: { numero } });
        const extra: Record<string, unknown> = {};
        if (forcado) Object.assign(extra, { status: forcado, statusEm: new Date() });
        else if (reescrito) Object.assign(extra, { status: "roteiro", notaLari: null, statusEm: new Date() });
        if (arquivar) extra.arquivadoEm = new Date();
        if (desarquivar) extra.arquivadoEm = null;
        return tx.mktConteudo.update({ where: { codigo }, data: { ...(dados as object), ...extra, loteId: lote.id } as Prisma.MktConteudoUncheckedUpdateInput });
      });
    }

    const tarefas = comoLista(p.tarefas);
    const existentesT = new Map((await prisma.mktTarefa.findMany({ where: { codigo: { in: tarefas.map((t) => String(t.codigo ?? "")) } } })).map((t) => [t.codigo, t]));
    for (const t of tarefas) {
      const codigo = texto(t.codigo);
      if (!codigo || !texto(t.titulo) || (t.prazo && !ehDia(t.prazo))) {
        previa.erros.push(`Tarefa ${texto(t.titulo) ?? codigo ?? "?"}: precisa de codigo, titulo e prazo AAAA-MM-DD (ou sem prazo).`);
        continue;
      }
      const dados = {
        titulo: String(t.titulo),
        detalhe: texto(t.detalhe),
        tipo: texto(t.tipo) ?? "outro",
        prazo: t.prazo ? comoDia(String(t.prazo)) : null,
        link: texto(t.link),
        linkRotulo: texto(t.linkRotulo),
      };
      const conteudoCodigo = texto(t.conteudo);
      const atual = existentesT.get(codigo);
      const arquivar = !!t.arquivado && !atual?.arquivadoEm;
      if (!atual) previa.tarefas.novas.push(dados.titulo);
      else if (Object.entries(dados).some(([k, v]) => (k === "prazo" ? diaDe(atual.prazo) !== diaDe(v as Date | null) : !igual((atual as Json)[k], v))) || (!t.arquivado && atual.arquivadoEm))
        previa.tarefas.mudadas.push(dados.titulo);
      else if (!arquivar) continue;
      if (arquivar) previa.tarefas.arquivar.push(dados.titulo);

      ops.push(async (tx) => {
        const conteudo = conteudoCodigo ? await tx.mktConteudo.findUnique({ where: { codigo: conteudoCodigo }, select: { id: true } }) : null;
        const completo = { ...dados, conteudoId: conteudo?.id ?? null, arquivadoEm: t.arquivado ? (atual?.arquivadoEm ?? new Date()) : null };
        return tx.mktTarefa.upsert({ where: { codigo }, create: { codigo, ...completo }, update: completo });
      });
    }
  }

  return { previa, ops };
}

export async function preverPlano(entrada: unknown) {
  return (await planejar(entrada)).previa;
}

// Grava tudo de uma vez: se uma parte falhar, nada muda.
export async function gravarPlano(entrada: unknown) {
  const { previa, ops } = await planejar(entrada);
  if (previa.erros.length) return { previa, gravado: false };
  await prisma.$transaction(async (tx) => {
    for (const op of ops) await op(tx);
  }, { timeout: 60_000 });
  return { previa, gravado: true };
}
