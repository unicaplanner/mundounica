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
