import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { paraDecimal } from "@/lib/financeiro/valores";

// Custo de compra de uma variante (revenda com custo por variante).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  const { custoCompra } = await req.json();

  let valor: Prisma.Decimal | null = null;
  if (custoCompra !== null && custoCompra !== "") {
    valor = paraDecimal(custoCompra);
    if (!valor) return erro("Informe o custo como um número, por exemplo 12,50.");
  }

  const atualizada = await prisma.variante.update({ where: { id }, data: { custoCompra: valor } }).catch(() => null);
  if (!atualizada) return erro("Variante não encontrada.", 404);
  return NextResponse.json({ ok: true });
}
