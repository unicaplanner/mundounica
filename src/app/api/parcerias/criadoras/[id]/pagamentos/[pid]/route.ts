import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { paraData } from "@/lib/parcerias/leitura";

// Marca (ou desmarca, com pagoEm vazio) a parcela como paga.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; pid: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id, pid } = await params;
  const body = await req.json();
  const pagoEm = paraData(body.pagoEm);
  if (pagoEm === undefined) return erro("Data inválida.");
  await prisma.pagamentoParceria.updateMany({ where: { id: pid, criadoraId: id }, data: { pagoEm } });
  // Todas pagas: a ficha tambem passa a "cache ja pago".
  const pendentes = await prisma.pagamentoParceria.count({ where: { criadoraId: id, pagoEm: null } });
  await prisma.criadora.update({ where: { id }, data: { pago: pendentes === 0, pagoEm: pendentes === 0 ? pagoEm : null } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; pid: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id, pid } = await params;
  await prisma.pagamentoParceria.deleteMany({ where: { id: pid, criadoraId: id } });
  return NextResponse.json({ ok: true });
}
