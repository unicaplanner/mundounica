import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUsuario, naoAutenticado } from "@/lib/auth";

// Marcar/desmarcar a tarefa como feita.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; tid: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id, tid } = await params;
  const body = await req.json();
  await prisma.tarefaCampanha.updateMany({ where: { id: tid, campanhaId: id }, data: { feita: Boolean(body.feita) } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; tid: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id, tid } = await params;
  await prisma.tarefaCampanha.deleteMany({ where: { id: tid, campanhaId: id } });
  return NextResponse.json({ ok: true });
}
