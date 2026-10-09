import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUsuario, naoAutenticado } from "@/lib/auth";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; msgId: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id, msgId } = await params;
  await prisma.mensagemFornecedor.deleteMany({ where: { id: msgId, fornecedorId: id } });
  return NextResponse.json({ ok: true });
}
