import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { paraTexto } from "@/lib/financeiro/valores";

// Registra uma mensagem importante (prazo combinado, desconto, problema...).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  const body = await req.json();
  const texto = paraTexto(body.texto, 2000);
  if (!texto) return erro("Escreva a mensagem.");
  const data = body.data ? new Date(`${body.data}T12:00:00`) : new Date();
  if (Number.isNaN(data.getTime())) return erro("Data inválida.");
  const fornecedor = await prisma.fornecedor.findUnique({ where: { id }, select: { id: true } });
  if (!fornecedor) return erro("Fornecedor não encontrado.", 404);
  await prisma.mensagemFornecedor.create({ data: { fornecedorId: id, texto, data } });
  return NextResponse.json({ ok: true });
}
