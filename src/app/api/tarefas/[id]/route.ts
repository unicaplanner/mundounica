import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { lerTarefa } from "@/lib/tarefas/entrada";

// Edita uma tarefa manual (status, prazo, tags, checklist...). As automaticas
// nao passam por aqui: o status delas vem do modulo de origem.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return erro("Pedido inválido.");

  const lido = lerTarefa(body, false);
  if (!lido.ok) return erro(lido.erro);
  const { count } = await prisma.tarefa.updateMany({ where: { id }, data: lido.dados });
  if (!count) return erro("Essa tarefa não existe mais.", 404);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  await prisma.tarefa.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
