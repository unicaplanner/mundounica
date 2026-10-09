import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { paraLink, paraTexto } from "@/lib/financeiro/valores";

// Edita os dados do fornecedor. Trocar o nome atualiza o nome nas compras.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  const body = await req.json();

  const nome = paraTexto(body.nome, 80);
  if (!nome) return erro("Dê um nome pro fornecedor.");
  const whatsapp = String(body.whatsapp ?? "").replace(/\D/g, "") || null;
  if (whatsapp && (whatsapp.length < 10 || whatsapp.length > 13)) return erro("WhatsApp: digite o número com DDD, por exemplo 11 98765-4321.");
  const link = paraLink(body.link);
  if (link === undefined) return erro("O link precisa começar com https://.");

  try {
    await prisma.$transaction([
      prisma.fornecedor.update({ where: { id }, data: { nome, whatsapp, link, observacoes: paraTexto(body.observacoes, 1000) } }),
      prisma.compra.updateMany({ where: { fornecedorId: id }, data: { fornecedor: nome } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") return erro("Já existe um fornecedor com esse nome.", 409);
      if (e.code === "P2025") return erro("Esse fornecedor não existe mais.", 404);
    }
    throw e;
  }
}

// So exclui fornecedor sem compras (as compras sao o historico dele).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  const compras = await prisma.compra.count({ where: { fornecedorId: id } });
  if (compras > 0) return erro(`Não dá pra excluir: o fornecedor tem ${compras} ${compras === 1 ? "compra" : "compras"}.`, 409);
  await prisma.fornecedor.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
