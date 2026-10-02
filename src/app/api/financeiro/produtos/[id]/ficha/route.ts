import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { paraDecimal } from "@/lib/financeiro/valores";

// Adiciona um material a ficha tecnica, ou atualiza a quantidade se ele ja
// estiver nela (produto+material e unico).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id: produtoId } = await params;
  const { materialId, quantidade } = await req.json();

  const qtd = paraDecimal(quantidade);
  if (!qtd || qtd.isZero()) return erro("Informe a quantidade, por exemplo 40.");

  const [produto, material] = await Promise.all([
    prisma.produto.findUnique({ where: { id: produtoId }, select: { id: true } }),
    prisma.material.findUnique({ where: { id: String(materialId) }, select: { id: true } }),
  ]);
  if (!produto) return erro("Produto não encontrado.", 404);
  if (!material) return erro("Escolha um material da lista.");

  await prisma.fichaTecnicaItem.upsert({
    where: { produtoId_materialId: { produtoId, materialId: material.id } },
    create: { produtoId, materialId: material.id, quantidade: qtd },
    update: { quantidade: qtd },
  });

  return NextResponse.json({ ok: true });
}
