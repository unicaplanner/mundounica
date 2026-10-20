import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { paraTexto } from "@/lib/financeiro/valores";

export async function POST(req: Request) {
  if (!(await getUsuario())) return naoAutenticado();
  const body = await req.json();
  const titulo = paraTexto(body.titulo, 80);
  const texto = paraTexto(body.texto, 5000);
  if (!titulo || !texto) return erro("Preencha o título e o texto.");
  const posicao = await prisma.modeloMensagem.count();
  await prisma.modeloMensagem.create({ data: { titulo, texto, posicao } });
  return NextResponse.json({ ok: true });
}
