import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { paraDecimal } from "@/lib/financeiro/valores";

// Custo de compra (revenda) e/ou tempo de producao de uma variante, quando o
// produto tem custo por variante. So mexe nos campos que vierem.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  const body = await req.json();

  const data: Prisma.VarianteUpdateInput = {};
  if ("custoCompra" in body) {
    if (body.custoCompra === null || body.custoCompra === "") data.custoCompra = null;
    else {
      const valor = paraDecimal(body.custoCompra);
      if (!valor) return erro("Informe o custo como um número, por exemplo 12,50.");
      data.custoCompra = valor;
    }
  }
  if ("minutosProducao" in body) {
    if (body.minutosProducao === null || body.minutosProducao === "") data.minutosProducao = null;
    else {
      const minutos = paraDecimal(body.minutosProducao);
      if (!minutos) return erro("Informe o tempo em minutos, por exemplo 15.");
      data.minutosProducao = minutos;
    }
  }

  const atualizada = await prisma.variante.update({ where: { id }, data }).catch(() => null);
  if (!atualizada) return erro("Variante não encontrada.", 404);
  return NextResponse.json({ ok: true });
}
