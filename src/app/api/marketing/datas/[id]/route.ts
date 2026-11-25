import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUsuario, naoAutenticado } from "@/lib/auth";

// Tirar uma data da marca do calendario (e so uma marcacao, sem historico).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  await prisma.mktData.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
