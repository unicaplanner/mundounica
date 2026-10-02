import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { paraDecimal } from "@/lib/financeiro/valores";
import { copiarComposicao } from "@/lib/financeiro/composicao";

const TIPOS = ["revenda", "producao_propria", "kit"] as const;

// Classifica o produto, liga/desliga custo por variante e/ou define o custo
// de compra unico (revenda). Trocar de tipo nao apaga composicao nenhuma:
// so deixa de usar no calculo, entao da pra voltar atras sem perder nada.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  const body = await req.json();

  const produto = await prisma.produto.findUnique({
    where: { id },
    select: { custoPorVariante: true, variantes: { where: { ativa: true }, select: { id: true } } },
  });
  if (!produto) return erro("Produto não encontrado.", 404);

  const data: Prisma.ProdutoUpdateInput = {};

  if ("tipo" in body) {
    if (body.tipo !== null && !TIPOS.includes(body.tipo)) return erro("Tipo de produto inválido.");
    if (body.tipo === "kit") {
      const dentroDeKit = await prisma.kitItem.count({ where: { componente: { produtoId: id } } });
      if (dentroDeKit > 0) {
        return erro("Esse produto está dentro de um kit, e kit não pode entrar em outro kit. Tire ele do kit antes.", 409);
      }
    }
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

  const ligandoPorVariante = body.custoPorVariante === true && !produto.custoPorVariante;
  if ("custoPorVariante" in body) data.custoPorVariante = body.custoPorVariante === true;

  await prisma.$transaction(async (tx) => {
    await tx.produto.update({ where: { id }, data });

    // Ao passar a ter custo por variante, cada variante que ainda nao tem
    // composicao propria comeca com uma copia da composicao do produto --
    // ai so precisa ajustar o que muda (ex: o tamanho do papel).
    if (ligandoPorVariante) {
      const [comFicha, comKit, comCusto] = await Promise.all([
        tx.fichaTecnicaItem.findMany({ where: { produtoId: id, varianteId: { not: null } }, select: { varianteId: true } }),
        tx.kitItem.findMany({ where: { kitProdutoId: id, kitVarianteId: { not: null } }, select: { kitVarianteId: true } }),
        tx.variante.findMany({ where: { produtoId: id, custoCompra: { not: null } }, select: { id: true } }),
      ]);
      const jaTem = new Set([
        ...comFicha.map((f) => f.varianteId),
        ...comKit.map((k) => k.kitVarianteId),
        ...comCusto.map((v) => v.id),
      ]);
      const vazias = produto.variantes.map((v) => v.id).filter((vid) => !jaTem.has(vid));
      if (vazias.length > 0) await copiarComposicao(tx, id, null, vazias);
    }
  });

  return NextResponse.json({ ok: true });
}
