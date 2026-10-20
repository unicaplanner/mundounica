import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { paraTexto } from "@/lib/financeiro/valores";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  const body = await req.json();
  const titulo = paraTexto(body.titulo, 80);
  const texto = paraTexto(body.texto, 5000);
  if (!titulo || !texto) return erro("Preencha o título e o texto.");
  await prisma.modeloMensagem.updateMany({ where: { id }, data: { titulo, texto } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  await prisma.modeloMensagem.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
