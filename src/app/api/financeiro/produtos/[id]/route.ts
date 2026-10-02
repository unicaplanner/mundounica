import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { paraDecimal } from "@/lib/financeiro/valores";

const TIPOS = ["revenda", "producao_propria"] as const;

// Classifica o produto e/ou define o custo de compra (so usado em revenda).
// Trocar de producao_propria pra revenda nao apaga a ficha tecnica, so
// deixa de usar ela no calculo -- da pra voltar atras sem perder nada.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  const body = await req.json();

  const data: Prisma.ProdutoUpdateInput = {};

  if ("tipo" in body) {
    if (body.tipo !== null && !TIPOS.includes(body.tipo)) return erro("Tipo de produto inválido.");
    data.tipo = body.tipo;
  }

  if ("custoCompra" in body) {
    if (body.custoCompra === null || body.custoCompra === "") {
      data.custoCompra = null;
    } else {
      const custo = paraDecimal(body.custoCompra);
      if (!custo) return erro("Informe o custo como um número, por exemplo 12,50.");
      data.custoCompra = custo;
    }
  }

  const produto = await prisma.produto.update({ where: { id }, data }).catch(() => null);
  if (!produto) return erro("Produto não encontrado.", 404);
  return NextResponse.json({ ok: true });
}
