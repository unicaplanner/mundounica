import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { lerTarefa } from "@/lib/tarefas/entrada";

// Cria uma tarefa manual no organizador.
export async function POST(req: Request) {
  if (!(await getUsuario())) return naoAutenticado();
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return erro("Pedido inválido.");

  const lido = lerTarefa(body, true);
  if (!lido.ok) return erro(lido.erro);
  const tarefa = await prisma.tarefa.create({ data: lido.dados as Prisma.TarefaUncheckedCreateInput });
  return NextResponse.json({ ok: true, id: tarefa.id });
}
