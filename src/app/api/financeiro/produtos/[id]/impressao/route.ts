import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { paraDecimal } from "@/lib/financeiro/valores";
import { varianteDoProduto } from "@/lib/financeiro/composicao";

// Define quantas folhas impressas (frente e verso) vao em uma unidade do
// produto ou da variante. Nao escolhe impressora: o custo da folha e o da
// impressora mais cara. 0 ou vazio tira a impressao.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id: produtoId } = await params;
  const body = await req.json();

  const folhas = paraDecimal(body.folhas === "" || body.folhas === undefined ? "0" : body.folhas);
  if (!folhas) return erro("Informe quantas folhas, por exemplo 40.");

  const [produto, dono] = await Promise.all([
    prisma.produto.findUnique({ where: { id: produtoId }, select: { id: true } }),
    varianteDoProduto(produtoId, body.varianteId),
  ]);
  if (!produto) return erro("Produto não encontrado.", 404);
  if (!dono.ok) return erro("Variante não encontrada nesse produto.", 404);

  // uma linha por dono (antes podia ter uma por impressora)
  await prisma.$transaction(async (tx) => {
    await tx.impressaoItem.deleteMany({ where: { produtoId, varianteId: dono.varianteId } });
    if (!folhas.isZero()) {
      await tx.impressaoItem.create({ data: { produtoId, varianteId: dono.varianteId, folhas } });
    }
  });

  return NextResponse.json({ ok: true });
}
