import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { copiarComposicao } from "@/lib/financeiro/composicao";

// Copia a composicao de uma variante pra outras do mesmo produto,
// substituindo o que elas tinham. Ex: monta a ficha do A5 Argolado e aplica
// em todas as variantes com "A5" no nome.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id: produtoId } = await params;
  const { origemVarianteId, destinoVarianteIds } = await req.json();

  if (!Array.isArray(destinoVarianteIds) || destinoVarianteIds.length === 0) {
    return erro("Escolha pelo menos uma variante pra receber a cópia.");
  }

  const ids = [String(origemVarianteId), ...destinoVarianteIds.map(String)];
  const doProduto = await prisma.variante.count({ where: { id: { in: ids }, produtoId } });
  if (doProduto !== new Set(ids).size) return erro("Alguma variante escolhida não é desse produto.");

  const destinos = destinoVarianteIds.map(String).filter((v) => v !== String(origemVarianteId));
  await prisma.$transaction((tx) => copiarComposicao(tx, produtoId, String(origemVarianteId), destinos));

  return NextResponse.json({ ok: true, copiadas: destinos.length });
}
