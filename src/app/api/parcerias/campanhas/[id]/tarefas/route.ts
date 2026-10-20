import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { paraTexto } from "@/lib/financeiro/valores";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  const body = await req.json();
  const texto = paraTexto(body.texto, 300);
  if (!texto) return erro("Escreva a tarefa.");
  const fase = paraTexto(body.fase, 80) ?? "Geral";
  const campanha = await prisma.campanha.findUnique({ where: { id }, select: { _count: { select: { tarefas: true } } } });
  if (!campanha) return erro("Campanha não encontrada.", 404);
  await prisma.tarefaCampanha.create({
    data: { campanhaId: id, fase, texto, dica: paraTexto(body.dica, 1000), posicao: campanha._count.tarefas },
  });
  return NextResponse.json({ ok: true });
}
