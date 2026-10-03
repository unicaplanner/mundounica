import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { paraDecimal } from "@/lib/financeiro/valores";
import { varianteDoProduto } from "@/lib/financeiro/composicao";

// Adiciona paginas de uma impressora a composicao (do produto ou de uma
// variante), ou atualiza a quantidade se a impressora ja estiver la.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id: produtoId } = await params;
  const body = await req.json();

  const paginas = paraDecimal(body.paginas);
  if (!paginas || paginas.isZero()) return erro("Informe quantas páginas (lados impressos), por exemplo 80.");

  const [produto, impressora, dono] = await Promise.all([
    prisma.produto.findUnique({ where: { id: produtoId }, select: { id: true } }),
    prisma.impressora.findUnique({ where: { id: String(body.impressoraId) }, select: { id: true } }),
    varianteDoProduto(produtoId, body.varianteId),
  ]);
  if (!produto) return erro("Produto não encontrado.", 404);
  if (!impressora) return erro("Escolha uma impressora da lista.");
  if (!dono.ok) return erro("Variante não encontrada nesse produto.", 404);

  await prisma.$transaction(async (tx) => {
    const existente = await tx.impressaoItem.findFirst({
      where: { produtoId, varianteId: dono.varianteId, impressoraId: impressora.id },
      select: { id: true },
    });
    if (existente) {
      await tx.impressaoItem.update({ where: { id: existente.id }, data: { paginas } });
    } else {
      await tx.impressaoItem.create({
        data: { produtoId, varianteId: dono.varianteId, impressoraId: impressora.id, paginas },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
