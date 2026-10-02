import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { paraDecimal } from "@/lib/financeiro/valores";
import { varianteDoProduto } from "@/lib/financeiro/composicao";

// Adiciona um material a composicao (do produto ou de uma variante), ou
// atualiza a quantidade se ele ja estiver la.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id: produtoId } = await params;
  const body = await req.json();

  const qtd = paraDecimal(body.quantidade);
  if (!qtd || qtd.isZero()) return erro("Informe a quantidade, por exemplo 40.");

  const [produto, material, dono] = await Promise.all([
    prisma.produto.findUnique({ where: { id: produtoId }, select: { id: true } }),
    prisma.material.findUnique({ where: { id: String(body.materialId) }, select: { id: true } }),
    varianteDoProduto(produtoId, body.varianteId),
  ]);
  if (!produto) return erro("Produto não encontrado.", 404);
  if (!material) return erro("Escolha um material da lista.");
  if (!dono.ok) return erro("Variante não encontrada nesse produto.", 404);

  await prisma.$transaction(async (tx) => {
    const existente = await tx.fichaTecnicaItem.findFirst({
      where: { produtoId, varianteId: dono.varianteId, materialId: material.id },
      select: { id: true },
    });
    if (existente) {
      await tx.fichaTecnicaItem.update({ where: { id: existente.id }, data: { quantidade: qtd } });
    } else {
      await tx.fichaTecnicaItem.create({
        data: { produtoId, varianteId: dono.varianteId, materialId: material.id, quantidade: qtd },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
