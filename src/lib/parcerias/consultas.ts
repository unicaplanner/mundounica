import type { Prisma, StatusCriadora } from "@prisma/client";
import { prisma } from "@/lib/db";
import { carregarCustos, nomeVariante } from "@/lib/financeiro/custo";
import { DIAS_LEMBRETE } from "./rotulos";

const DIA = 24 * 60 * 60 * 1000;

type EnvioComItens = { custoFrete: Prisma.Decimal | null; itens: { quantidade: number; custoUnitario: Prisma.Decimal | null }[] };

// Quanto a parceria custou: produtos mandados + frete + cache pago.
export function investimento(c: { envios: EnvioComItens[]; acordo: string | null; valorCombinado: Prisma.Decimal | null; pago: boolean }) {
  let produtos = 0;
  let frete = 0;
  let semCusto = 0;
  for (const e of c.envios) {
    frete += e.custoFrete?.toNumber() ?? 0;
    for (const i of e.itens) {
      if (i.custoUnitario) produtos += i.custoUnitario.toNumber() * i.quantidade;
      else semCusto += 1;
    }
  }
  const cache = c.acordo === "pago" && c.pago ? (c.valorCombinado?.toNumber() ?? 0) : 0;
  return { produtos, frete, cache, total: produtos + frete + cache, semCusto };
}

// Etapa depois de fechar: fechou -> enviado -> postou -> vendeu.
export function etapaPosFechar(c: {
  status: StatusCriadora;
  envios: unknown[];
  entregas: { publicadoEm: Date | null }[];
  cupomPedidos: number | null;
}) {
  if (c.status !== "fechada") return null;
  if ((c.cupomPedidos ?? 0) > 0) return "Vendeu";
  if (c.entregas.some((e) => e.publicadoEm)) return "Postou";
  if (c.envios.length > 0) return "Enviado";
  return "Falta enviar";
}

const incluirResumo = {
  campanha: { select: { id: true, nome: true } },
  envios: { select: { custoFrete: true, itens: { select: { quantidade: true, custoUnitario: true } } } },
  entregas: { select: { publicadoEm: true, prazo: true } },
  _count: { select: { propostas: true } },
} satisfies Prisma.CriadoraInclude;

export async function listarCriadoras(filtro: Prisma.CriadoraWhereInput = {}) {
  return prisma.criadora.findMany({
    where: filtro,
    include: incluirResumo,
    orderBy: [{ statusEm: "desc" }],
  });
}

export type CriadoraResumo = Awaited<ReturnType<typeof listarCriadoras>>[number];

export async function getCriadora(id: string) {
  return prisma.criadora.findUnique({
    where: { id },
    include: {
      campanha: { select: { id: true, nome: true } },
      registros: { orderBy: { data: "desc" } },
      propostas: { orderBy: { recebidaEm: "desc" } },
      envios: { orderBy: { data: "desc" }, include: { itens: true } },
      entregas: { orderBy: [{ prazo: "asc" }, { createdAt: "asc" }] },
      respostas: { orderBy: { enviadaEm: "desc" } },
      producao: { orderBy: { posicao: "asc" } },
    },
  });
}

// Catalogo pra escolher o que foi mandado, com o custo vindo do Financeiro.
export async function catalogoParaEnvio() {
  const [custos, variantes] = await Promise.all([
    carregarCustos(),
    prisma.variante.findMany({
      where: { ativa: true, produto: { status: { not: "ARCHIVED" } } },
      select: { id: true, title: true, produto: { select: { title: true } } },
      orderBy: [{ produto: { title: "asc" } }, { posicao: "asc" }],
    }),
  ]);
  return variantes.map((v) => ({
    id: v.id,
    nome: nomeVariante(v.produto.title, v.title),
    custo: custos.daVariante(v.id)?.valor.toNumber() ?? null,
  }));
}

export async function carregarPainel() {
  const agora = Date.now();
  const [criadoras, respostasSoltas, propostasPendentes] = await Promise.all([
    listarCriadoras(),
    prisma.respostaFormulario.count({ where: { criadoraId: null } }),
    prisma.propostaUgc.count({ where: { recomendacao: null } }),
  ]);

  const porStatus = new Map<StatusCriadora, number>();
  for (const c of criadoras) porStatus.set(c.status, (porStatus.get(c.status) ?? 0) + 1);

  const lembrete = criadoras.filter((c) => c.status === "contatada" && agora - c.statusEm.getTime() > DIAS_LEMBRETE * DIA);
  const fechadas = criadoras.filter((c) => c.status === "fechada");
  const faltaEnviar = fechadas.filter((c) => c.envios.length === 0);
  const entregasAtrasadas = fechadas.filter((c) => c.entregas.some((e) => !e.publicadoEm && e.prazo && e.prazo.getTime() < agora));
  const pagamentoPendente = criadoras.filter((c) => c.acordo === "pago" && c.status === "fechada" && !c.pago);

  let investido = 0;
  let vendas = 0;
  let pedidos = 0;
  for (const c of criadoras) {
    investido += investimento(c).total;
    vendas += c.cupomVendas?.toNumber() ?? 0;
    pedidos += c.cupomPedidos ?? 0;
  }
  const ranking = criadoras
    .filter((c) => c.cupom)
    .map((c) => ({ id: c.id, instagram: c.instagram, nome: c.nome, cupom: c.cupom!, pedidos: c.cupomPedidos ?? 0, vendas: c.cupomVendas?.toNumber() ?? 0, investido: investimento(c).total }))
    .sort((a, b) => b.vendas - a.vendas);
  const cuponsAtualizadosEm = criadoras.map((c) => c.cupomAtualizadoEm).filter((d): d is Date => d !== null).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  return {
    total: criadoras.length,
    porStatus,
    naoRevisadas: porStatus.get("nova") ?? 0,
    lembrete,
    faltaEnviar,
    entregasAtrasadas,
    pagamentoPendente,
    respostasSoltas,
    propostasPendentes,
    investido,
    vendas,
    pedidos,
    ranking,
    cuponsAtualizadosEm,
  };
}
