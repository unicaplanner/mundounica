import { prisma } from "@/lib/db";
import { markup, type ParametrosAnalise } from "./analise";

export type ParametrosPrecificacao = ParametrosAnalise & {
  totalFixos: number;
  faturamentoMensal: number | null;
  markup: number | null; // null quando os percentuais somam 100% ou mais
};

export async function carregarParametros(): Promise<ParametrosPrecificacao> {
  const [fixos, despesas, config] = await Promise.all([
    prisma.custoFixo.aggregate({ _sum: { valorMensal: true } }),
    prisma.despesaVariavel.aggregate({ _sum: { percentual: true } }),
    prisma.configuracaoPrecificacao.findUnique({ where: { id: "unica" } }),
  ]);

  const totalFixos = fixos._sum.valorMensal?.toNumber() ?? 0;
  const faturamentoMensal = config?.faturamentoMensal?.toNumber() ?? null;
  const base: ParametrosAnalise = {
    fixosPct: faturamentoMensal && faturamentoMensal > 0 ? (totalFixos / faturamentoMensal) * 100 : null,
    despesasPct: despesas._sum.percentual?.toNumber() ?? 0,
    lucroPct: config?.lucroDesejado.toNumber() ?? 15,
  };
  return { ...base, totalFixos, faturamentoMensal, markup: markup(base) };
}
