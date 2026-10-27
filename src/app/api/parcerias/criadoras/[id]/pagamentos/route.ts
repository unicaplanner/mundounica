import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { paraDecimal, paraTexto } from "@/lib/financeiro/valores";
import { paraData } from "@/lib/parcerias/leitura";

// Parcela do cache (ex: "50% no fechamento").
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  const body = await req.json();
  const descricao = paraTexto(body.descricao, 120);
  if (!descricao) return erro("Descreva a parcela (ex: 50% no fechamento).");
  const valor = paraDecimal(body.valor);
  if (!valor || valor.isZero()) return erro("Valor da parcela inválido.");
  const vencimento = paraData(body.vencimento);
  const pagoEm = paraData(body.pagoEm);
  if (vencimento === undefined || pagoEm === undefined) return erro("Data inválida.");
  const criadora = await prisma.criadora.findUnique({ where: { id }, select: { id: true } });
  if (!criadora) return erro("Criadora não encontrada.", 404);
  await prisma.pagamentoParceria.create({ data: { criadoraId: id, descricao, valor, vencimento, pagoEm } });
  return NextResponse.json({ ok: true });
}
