import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { lerDespesaVariavel } from "@/lib/financeiro/leitura";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  const lido = lerDespesaVariavel(await req.json());
  if (!lido.ok) return erro(lido.erro);
  const atualizada = await prisma.despesaVariavel.update({ where: { id }, data: lido.dados }).catch(() => null);
  if (!atualizada) return erro("Essa despesa não existe mais.", 404);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  await prisma.despesaVariavel.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
