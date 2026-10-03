import type { Prisma } from "@prisma/client";
import { paraDecimal, paraTexto } from "./valores";

type Lido<T> = { ok: true; dados: T } | { ok: false; erro: string };

export function lerCustoFixo(body: Record<string, unknown>): Lido<{
  nome: string;
  categoria: string;
  valorMensal: Prisma.Decimal;
}> {
  const nome = paraTexto(body.nome);
  if (!nome) return { ok: false, erro: "Dê um nome pro custo, por exemplo Contador." };
  const valorMensal = paraDecimal(body.valorMensal);
  if (!valorMensal) return { ok: false, erro: "Informe o valor por mês, por exemplo 350,00." };
  return { ok: true, dados: { nome, categoria: paraTexto(body.categoria, 60) ?? "Outros", valorMensal } };
}

export function lerDespesaVariavel(body: Record<string, unknown>): Lido<{
  nome: string;
  percentual: Prisma.Decimal;
}> {
  const nome = paraTexto(body.nome);
  if (!nome) return { ok: false, erro: "Dê um nome pra despesa, por exemplo Simples Nacional." };
  const percentual = paraDecimal(body.percentual);
  if (!percentual || percentual.gte(100)) return { ok: false, erro: "Informe o percentual sobre a venda, por exemplo 6 ou 4,99." };
  return { ok: true, dados: { nome, percentual } };
}

export function lerImpressora(body: Record<string, unknown>): Lido<{
  nome: string;
  modelo: string | null;
  precoCompra: Prisma.Decimal;
  vidaUtilAnos: Prisma.Decimal;
  tintaAno: Prisma.Decimal;
  manutencaoAno: Prisma.Decimal;
  paginasAno: number | null;
}> {
  const nome = paraTexto(body.nome, 60);
  if (!nome) return { ok: false, erro: "Dê um apelido pra impressora, por exemplo Guerreira Mãe." };
  const precoCompra = paraDecimal(body.precoCompra);
  if (!precoCompra) return { ok: false, erro: "Informe quanto a impressora custou." };
  const vidaUtilAnos = paraDecimal(body.vidaUtilAnos);
  if (!vidaUtilAnos || vidaUtilAnos.isZero()) return { ok: false, erro: "Informe a vida útil em anos, por exemplo 6." };
  const tintaAno = paraDecimal(body.tintaAno);
  if (!tintaAno) return { ok: false, erro: "Informe o gasto com tinta por ano (pode ser 0)." };
  const manutencaoAno = paraDecimal(body.manutencaoAno ?? "0") ?? null;
  if (!manutencaoAno) return { ok: false, erro: "Informe a manutenção por ano (pode ser 0)." };

  let paginasAno: number | null = null;
  if (body.paginasAno !== undefined && body.paginasAno !== null && String(body.paginasAno).trim() !== "") {
    const p = paraDecimal(body.paginasAno);
    if (!p || p.isZero()) return { ok: false, erro: "Informe as páginas por ano como um número, por exemplo 12000." };
    paginasAno = Math.round(p.toNumber());
  }

  return {
    ok: true,
    dados: { nome, modelo: paraTexto(body.modelo, 60), precoCompra, vidaUtilAnos, tintaAno, manutencaoAno, paginasAno },
  };
}
