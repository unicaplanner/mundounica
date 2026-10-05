import { Prisma } from "@prisma/client";

type DadosImpressora = {
  precoCompra: Prisma.Decimal;
  vidaUtilAnos: Prisma.Decimal;
  tintaAno: Prisma.Decimal;
  manutencaoAno: Prisma.Decimal;
  paginasAno: number | null;
};

// Custo anual = reserva pra trocar a impressora (preco / vida util) + tinta
// + manutencao. null se ainda nao da pra calcular (sem volume de paginas).
export function custoAnualImpressora(i: DadosImpressora): Prisma.Decimal | null {
  if (i.vidaUtilAnos.lte(0)) return null;
  return i.precoCompra.dividedBy(i.vidaUtilAnos).plus(i.tintaAno).plus(i.manutencaoAno);
}

// Custo de uma pagina (um lado impresso).
export function custoPorPagina(i: DadosImpressora): Prisma.Decimal | null {
  const anual = custoAnualImpressora(i);
  if (!anual || !i.paginasAno || i.paginasAno <= 0) return null;
  return anual.dividedBy(i.paginasAno);
}

// Toda folha e impressa frente e verso: 2 paginas.
export const PAGINAS_POR_FOLHA = 2;

export function custoPorFolha(i: DadosImpressora): Prisma.Decimal | null {
  return custoPorPagina(i)?.times(PAGINAS_POR_FOLHA) ?? null;
}

// A impressora cujo custo vale nos produtos e envios: a de folha mais cara
// (com paginas por ano informadas), pra cobrir o custo mesmo quando a
// impressao sai na outra. null se nenhuma tem custo calculavel ainda.
export function impressoraPadrao<T extends DadosImpressora>(impressoras: T[]): (T & { custoFolha: Prisma.Decimal }) | null {
  let escolhida: (T & { custoFolha: Prisma.Decimal }) | null = null;
  for (const i of impressoras) {
    const custoFolha = custoPorFolha(i);
    if (custoFolha && (!escolhida || custoFolha.gt(escolhida.custoFolha))) escolhida = { ...i, custoFolha };
  }
  return escolhida;
}
