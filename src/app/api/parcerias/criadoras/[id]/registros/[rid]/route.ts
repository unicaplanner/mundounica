import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUsuario, naoAutenticado } from "@/lib/auth";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; rid: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id, rid } = await params;
  await prisma.registroCriadora.deleteMany({ where: { id: rid, criadoraId: id } });
  return NextResponse.json({ ok: true });
}
