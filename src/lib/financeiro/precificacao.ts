import { prisma } from "@/lib/db";
import type { ParametrosAnalise } from "./analise";
import { carregarEnvio } from "./envio";

export type ParametrosPrecificacao = ParametrosAnalise & {
  faturamentoMensal: number | null;
  custoMedioEnvio: number | null; // R$ por pedido
  itensPorPedido: number | null;
  valorHora: number | null; // hora de producao (mao de obra)
};

// Os parametros de preco usados em todo o Financeiro. A embalagem de envio e
// um custo por pedido; dividida pelos produtos de um pedido medio, vira um
// valor em R$ que cada produto vendido paga (envioPorProduto).
export async function carregarParametros(): Promise<ParametrosPrecificacao> {
  const [fixos, despesas, config, envio] = await Promise.all([
    prisma.custoFixo.aggregate({ _sum: { valorMensal: true } }),
    prisma.despesaVariavel.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.configuracaoPrecificacao.findUnique({ where: { id: "unica" } }),
    carregarEnvio(),
  ]);

  const totalFixos = fixos._sum.valorMensal?.toNumber() ?? 0;
  const faturamentoMensal = config?.faturamentoMensal?.toNumber() ?? null;
  const lista = despesas.map((d) => ({ nome: d.nome, pct: d.percentual.toNumber() }));
  return {
    fixosPct: faturamentoMensal && faturamentoMensal > 0 ? (totalFixos / faturamentoMensal) * 100 : null,
    despesasPct: lista.reduce((acc, d) => acc + d.pct, 0),
    lucroPct: config?.lucroDesejado.toNumber() ?? 20,
    envioPorProduto: envio.porProduto ?? 0,
    despesas: lista,
    margens: {
      producao_propria: config?.margemProducao.toNumber() ?? 65,
      revenda: config?.margemRevenda.toNumber() ?? 30,
      kit: config?.margemKit.toNumber() ?? 50,
    },
    totalFixos,
    faturamentoMensal,
    custoMedioEnvio: envio.custoMedio,
    itensPorPedido: envio.itensPorPedido,
    valorHora: config?.valorHora?.toNumber() ?? null,
  };
}
