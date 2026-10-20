import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { paraTexto } from "@/lib/financeiro/valores";
import { paraData } from "@/lib/parcerias/leitura";

// Anota o que ela respondeu ou o que foi combinado.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  const body = await req.json();
  const texto = paraTexto(body.texto, 3000);
  if (!texto) return erro("Escreva a anotação.");
  const data = paraData(body.data) ?? new Date();
  const criadora = await prisma.criadora.findUnique({ where: { id }, select: { id: true } });
  if (!criadora) return erro("Criadora não encontrada.", 404);
  await prisma.registroCriadora.create({ data: { criadoraId: id, texto, data } });
  return NextResponse.json({ ok: true });
}
