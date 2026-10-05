import { prisma } from "@/lib/db";
import { markup, type ParametrosAnalise } from "./analise";
import { carregarEnvio } from "./envio";

export type ParametrosPrecificacao = ParametrosAnalise & {
  totalFixos: number;
  faturamentoMensal: number | null;
  markup: number | null; // null quando os percentuais somam 100% ou mais
  despesasVendaPct: number; // so as despesas por venda cadastradas (imposto, taxas)
  envioPct: number | null; // embalagem de envio em % do valor medio do pedido
  custoMedioEnvio: number | null; // R$ por pedido
};

// despesasPct (o que sai de cada venda, em % do preco) = despesas por venda
// + embalagem de envio. O envio e um custo por pedido; dividido pelo valor
// medio do pedido ele vira um % que cada produto vendido ajuda a pagar.
export async function carregarParametros(): Promise<ParametrosPrecificacao> {
  const [fixos, despesas, config, envio] = await Promise.all([
    prisma.custoFixo.aggregate({ _sum: { valorMensal: true } }),
    prisma.despesaVariavel.aggregate({ _sum: { percentual: true } }),
    prisma.configuracaoPrecificacao.findUnique({ where: { id: "unica" } }),
    carregarEnvio(),
  ]);

  const totalFixos = fixos._sum.valorMensal?.toNumber() ?? 0;
  const faturamentoMensal = config?.faturamentoMensal?.toNumber() ?? null;
  const despesasVendaPct = despesas._sum.percentual?.toNumber() ?? 0;
  const base: ParametrosAnalise = {
    fixosPct: faturamentoMensal && faturamentoMensal > 0 ? (totalFixos / faturamentoMensal) * 100 : null,
    despesasPct: despesasVendaPct + (envio.envioPct ?? 0),
    lucroPct: config?.lucroDesejado.toNumber() ?? 15,
  };
  return {
    ...base,
    totalFixos,
    faturamentoMensal,
    markup: markup(base),
    despesasVendaPct,
    envioPct: envio.envioPct,
    custoMedioEnvio: envio.custoMedio,
  };
}
