import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { paraDecimal } from "@/lib/financeiro/valores";
import { varianteDoProduto } from "@/lib/financeiro/composicao";

// Coloca um produto (numa variante especifica) dentro do kit, ou atualiza a
// quantidade se ele ja estiver la.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id: kitProdutoId } = await params;
  const body = await req.json();

  const qtd = paraDecimal(body.quantidade);
  if (!qtd || qtd.isZero()) return erro("Informe a quantidade, por exemplo 1.");

  const [kit, componente, dono] = await Promise.all([
    prisma.produto.findUnique({ where: { id: kitProdutoId }, select: { tipo: true } }),
    prisma.variante.findFirst({
      where: { id: String(body.componenteVarianteId), ativa: true },
      select: { id: true, produtoId: true, produto: { select: { tipo: true } } },
    }),
    varianteDoProduto(kitProdutoId, body.varianteId),
  ]);
  if (!kit) return erro("Produto não encontrado.", 404);
  if (kit.tipo !== "kit") return erro("Classifique o produto como kit antes de montar a composição.");
  if (!dono.ok) return erro("Variante não encontrada nesse produto.", 404);
  if (!componente) return erro("Escolha um produto da lista.");
  if (componente.produtoId === kitProdutoId) return erro("O kit não pode conter ele mesmo.");
  if (componente.produto.tipo === "kit") return erro("Kit não pode entrar dentro de outro kit.");

  await prisma.$transaction(async (tx) => {
    const existente = await tx.kitItem.findFirst({
      where: { kitProdutoId, kitVarianteId: dono.varianteId, componenteVarianteId: componente.id },
      select: { id: true },
    });
    if (existente) {
      await tx.kitItem.update({ where: { id: existente.id }, data: { quantidade: qtd } });
    } else {
      await tx.kitItem.create({
        data: { kitProdutoId, kitVarianteId: dono.varianteId, componenteVarianteId: componente.id, quantidade: qtd },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
