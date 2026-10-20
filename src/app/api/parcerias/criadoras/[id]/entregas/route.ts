import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { lerEntrega } from "@/lib/parcerias/entregas";

// Post/video combinado com a criadora.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  const lido = lerEntrega(await req.json());
  if (!lido.ok) return erro(lido.erro);
  if (!lido.dados.formato) return erro("Escolha o formato.");
  const criadora = await prisma.criadora.findUnique({ where: { id }, select: { id: true } });
  if (!criadora) return erro("Criadora não encontrada.", 404);
  await prisma.entregaParceria.create({ data: { ...lido.dados, formato: lido.dados.formato, criadoraId: id } });
  return NextResponse.json({ ok: true });
}
