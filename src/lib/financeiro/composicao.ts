import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// Confere que a variante existe e e do produto. null = composicao do produto inteiro.
export async function varianteDoProduto(produtoId: string, varianteId: unknown) {
  if (varianteId === null || varianteId === undefined || varianteId === "") return { ok: true as const, varianteId: null };
  const variante = await prisma.variante.findFirst({
    where: { id: String(varianteId), produtoId },
    select: { id: true },
  });
  return variante ? { ok: true as const, varianteId: variante.id } : { ok: false as const };
}

// Substitui a composicao (materiais, produtos do kit e custo de compra) de
// cada variante de destino por uma copia da origem. origemVarianteId nulo
// copia a composicao do produto inteiro.
export async function copiarComposicao(
  tx: Prisma.TransactionClient,
  produtoId: string,
  origemVarianteId: string | null,
  destinoVarianteIds: string[]
) {
  const [ficha, kit, origem] = await Promise.all([
    tx.fichaTecnicaItem.findMany({ where: { produtoId, varianteId: origemVarianteId } }),
    tx.kitItem.findMany({ where: { kitProdutoId: produtoId, kitVarianteId: origemVarianteId } }),
    origemVarianteId
      ? tx.variante.findUniqueOrThrow({ where: { id: origemVarianteId }, select: { custoCompra: true } })
      : tx.produto.findUniqueOrThrow({ where: { id: produtoId }, select: { custoCompra: true } }),
  ]);

  await tx.fichaTecnicaItem.deleteMany({ where: { produtoId, varianteId: { in: destinoVarianteIds } } });
  await tx.kitItem.deleteMany({ where: { kitProdutoId: produtoId, kitVarianteId: { in: destinoVarianteIds } } });

  await tx.fichaTecnicaItem.createMany({
    data: destinoVarianteIds.flatMap((varianteId) =>
      ficha.map((f) => ({ produtoId, varianteId, materialId: f.materialId, quantidade: f.quantidade }))
    ),
  });
  await tx.kitItem.createMany({
    data: destinoVarianteIds.flatMap((kitVarianteId) =>
      kit.map((k) => ({
        kitProdutoId: produtoId,
        kitVarianteId,
        componenteVarianteId: k.componenteVarianteId,
        quantidade: k.quantidade,
      }))
    ),
  });
  await tx.variante.updateMany({
    where: { id: { in: destinoVarianteIds }, produtoId },
    data: { custoCompra: origem.custoCompra },
  });
}
