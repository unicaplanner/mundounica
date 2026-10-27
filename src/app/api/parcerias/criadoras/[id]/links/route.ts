import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { paraLink, paraTexto } from "@/lib/financeiro/valores";

// Documento ou link da parceria (termo, guia, portfolio, midia kit).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  const body = await req.json();
  const titulo = paraTexto(body.titulo, 120);
  if (!titulo) return erro("Dê um nome pro link (ex: Termo assinado).");
  const url = paraLink(body.url);
  if (!url) return erro("Cole um link que comece com https://.");
  const criadora = await prisma.criadora.findUnique({ where: { id }, select: { id: true } });
  if (!criadora) return erro("Criadora não encontrada.", 404);
  await prisma.linkCriadora.create({ data: { criadoraId: id, titulo, url } });
  return NextResponse.json({ ok: true });
}
