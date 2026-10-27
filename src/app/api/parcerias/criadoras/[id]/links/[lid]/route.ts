import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUsuario, naoAutenticado } from "@/lib/auth";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; lid: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id, lid } = await params;
  await prisma.linkCriadora.deleteMany({ where: { id: lid, criadoraId: id } });
  return NextResponse.json({ ok: true });
}
