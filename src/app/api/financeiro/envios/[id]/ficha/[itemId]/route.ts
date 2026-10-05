import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUsuario, naoAutenticado } from "@/lib/auth";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id: tipoEnvioId, itemId } = await params;
  await prisma.envioMaterial.deleteMany({ where: { id: itemId, tipoEnvioId } });
  return NextResponse.json({ ok: true });
}
