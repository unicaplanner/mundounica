import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { lerCompra, recalcularCustoAtual } from "@/lib/financeiro/compras";

// Corrigir uma compra lancada errado. Se o material mudou, recalcula o
// custo dos dois: o antigo pode ter perdido justamente a compra mais recente.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;

  const atual = await prisma.compra.findUnique({ where: { id }, select: { materialId: true } });
  if (!atual) return erro("Essa compra não existe mais.", 404);

  const lido = await lerCompra(await req.json());
  if (!lido.ok) return erro(lido.erro);

  await prisma.$transaction(async (tx) => {
    await tx.compra.update({ where: { id }, data: lido.dados });
    await recalcularCustoAtual(tx, lido.dados.materialId);
    if (atual.materialId !== lido.dados.materialId) {
      await recalcularCustoAtual(tx, atual.materialId);
    }
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;

  const atual = await prisma.compra.findUnique({ where: { id }, select: { materialId: true } });
  if (!atual) return NextResponse.json({ ok: true });

  await prisma.$transaction(async (tx) => {
    await tx.compra.delete({ where: { id } });
    await recalcularCustoAtual(tx, atual.materialId);
  });

  return NextResponse.json({ ok: true });
}
