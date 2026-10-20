import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { normalizarBusca } from "@/lib/financeiro/formato";
import { ETAPAS, ordemDaEtapa, type EtapaProducao } from "./etapas";
import { lerItens, type ItemResposta } from "./formulario";

// Checklist de producao dos envios. Cada criadora que fechou tem uma lista
// curta do que a Lari precisa preparar; a tela de producao junta tudo por
// etapa (como o "Agrupado por item" da Central de Producao) pra fazer em lote:
// imprimir todos os blocos de uma vez, escrever todos os cartoes, etc.

type CriadoraBase = { nome: string | null; instagram: string | null; kit: string | null; cupom: string | null };

// Sugestao de codigo pro cupom: primeiro nome + 10 (CAMILE10).
export function sugestaoDeCupom(c: CriadoraBase) {
  const base = normalizarBusca(c.nome ?? c.instagram ?? "").replace(/[^a-z0-9]/g, "").toUpperCase().slice(0, 12);
  return base ? `${base}10` : null;
}

function nomeDoKit(kit: string | null) {
  const k = normalizarBusca(kit ?? "");
  if (k.includes("prem")) return "Case Clássica Premium";
  if (k.includes("inicio")) return "Case Início";
  return kit?.trim() || "Kit";
}

// O que cada criadora que fechou precisa ter pronto, na ordem de fazer.
export function itensDoModelo(c: CriadoraBase): { etapa: EtapaProducao; texto: string }[] {
  const cupom = c.cupom ?? sugestaoDeCupom(c);
  const para = c.nome ?? (c.instagram ? `@${c.instagram}` : "ela");
  return [
    { etapa: "cupom", texto: cupom ? `Cupom ${cupom} · 10% pras seguidoras` : "Cupom com o nome dela · 10% pras seguidoras" },
    { etapa: "kit", texto: `${nomeDoKit(c.kit)} (Planner 2027)` },
    { etapa: "blocos", texto: "Blocos que ela escolheu no formulário de permuta" },
    { etapa: "cartao", texto: `Cartão para ${para}${cupom ? ` com o cupom ${cupom}` : ""}` },
    { etapa: "embalar", texto: "Montar a caixa: case, blocos e cartão" },
    { etapa: "enviar", texto: "Enviar por UPExpress e lançar o rastreio na ficha" },
  ];
}

const EH_REAL = (c: { kit: string | null }) => c.kit?.toLowerCase() !== "reserva";

// Cria a lista de uma criadora. Nao mexe em quem ja tem lista (nem recria o
// que a Lari apagou de proposito).
export async function gerarChecklist(criadoraId: string) {
  const c = await prisma.criadora.findUnique({
    where: { id: criadoraId },
    select: { nome: true, instagram: true, kit: true, cupom: true, _count: { select: { producao: true } } },
  });
  if (!c || c._count.producao > 0) return 0;
  const itens = itensDoModelo(c);
  await prisma.itemProducaoParceria.createMany({
    data: itens.map((i, posicao) => ({ criadoraId, etapa: i.etapa, texto: i.texto, posicao })),
  });
  return itens.length;
}

export function filtroDeCampanha(campanhaId: string | undefined): Prisma.CriadoraWhereInput {
  return campanhaId === "sem" ? { campanhaId: null } : campanhaId ? { campanhaId } : {};
}

const FECHADAS_SEM_LISTA = (campanhaId?: string): Prisma.CriadoraWhereInput => ({
  status: "fechada",
  producao: { none: {} },
  ...filtroDeCampanha(campanhaId),
});

export async function criadorasSemChecklist(campanhaId?: string) {
  const lista = await prisma.criadora.findMany({ where: FECHADAS_SEM_LISTA(campanhaId), select: { id: true, kit: true } });
  return lista.filter(EH_REAL).map((c) => c.id);
}

export async function gerarParaFechadas(campanhaId?: string) {
  let total = 0;
  for (const id of await criadorasSemChecklist(campanhaId)) total += await gerarChecklist(id);
  return total;
}

export function contarProducaoPendente() {
  return prisma.itemProducaoParceria.count({ where: { feito: false, criadora: { status: "fechada" } } });
}

// Perguntas do formulario que sao de contato e nao ajudam a decidir o que
// imprimir (ficam so na ficha da criadora).
const CONTATO = /nome|endere|rua|cep|cidade|bairro|estado|complemento|numero|telefone|whats|celular|e-?mail|instagram|usuario|cpf|carimbo/;

export function respostasDeProducao(respostas: unknown): ItemResposta[] {
  return lerItens(respostas).filter((i) => !CONTATO.test(normalizarBusca(i.pergunta)));
}

export const incluirCriadoraNaProducao = {
  id: true,
  nome: true,
  nomeCompleto: true,
  instagram: true,
  kit: true,
  lote: true,
  cupom: true,
  endereco: true,
  whatsapp: true,
  respostas: { orderBy: { enviadaEm: "desc" }, take: 1, select: { respostas: true } },
} satisfies Prisma.CriadoraSelect;

// Itens da lista de producao das criadoras que fecharam. Quem nao seguiu ou
// foi descartada sai da lista sozinha.
export async function carregarProducao(campanhaId?: string) {
  const itens = await prisma.itemProducaoParceria.findMany({
    where: { criadora: { status: "fechada", ...filtroDeCampanha(campanhaId) } },
    include: { criadora: { select: incluirCriadoraNaProducao } },
    orderBy: [{ posicao: "asc" }, { createdAt: "asc" }],
  });
  const linhas = itens.filter((i) => EH_REAL(i.criadora));
  // Lote 1 antes do 2; sem lote por ultimo; empate pelo nome.
  return linhas.sort(
    (a, b) =>
      (a.criadora.lote ?? 99) - (b.criadora.lote ?? 99) ||
      (a.criadora.instagram ?? a.criadora.nome ?? "").localeCompare(b.criadora.instagram ?? b.criadora.nome ?? "") ||
      a.posicao - b.posicao
  );
}

export type ItemDeProducao = Awaited<ReturnType<typeof carregarProducao>>[number];

export function agruparPorEtapa(itens: ItemDeProducao[]) {
  return ETAPAS.map((e) => ({ ...e, itens: itens.filter((i) => i.etapa === e.valor) })).filter((g) => g.itens.length > 0);
}

export function agruparPorCriadora(itens: ItemDeProducao[]) {
  const mapa = new Map<string, { criadora: ItemDeProducao["criadora"]; itens: ItemDeProducao[] }>();
  for (const i of itens) {
    const g = mapa.get(i.criadora.id) ?? { criadora: i.criadora, itens: [] };
    g.itens.push(i);
    mapa.set(i.criadora.id, g);
  }
  for (const g of mapa.values()) g.itens.sort((a, b) => ordemDaEtapa(a.etapa) - ordemDaEtapa(b.etapa) || a.posicao - b.posicao);
  return [...mapa.values()];
}
