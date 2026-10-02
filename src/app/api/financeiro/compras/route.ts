import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { lerCompra, recalcularCustoAtual } from "@/lib/financeiro/compras";

export async function POST(req: Request) {
  if (!(await getUsuario())) return naoAutenticado();

  const lido = await lerCompra(await req.json());
  if (!lido.ok) return erro(lido.erro);

  await prisma.$transaction(async (tx) => {
    await tx.compra.create({ data: lido.dados });
    await recalcularCustoAtual(tx, lido.dados.materialId);
  });

  return NextResponse.json({ ok: true });
}
