import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { paraDecimal } from "@/lib/financeiro/valores";
import { aplicarMaterial } from "@/lib/financeiro/composicao";

// Coloca este material na composicao de varios produtos (so nas variantes escolhidas).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  const body = await req.json();

  const material = await prisma.material.findUnique({ where: { id }, select: { id: true } });
  if (!material) return erro("Esse material não existe mais.", 404);
  const quantidade = paraDecimal(body.quantidade);
  if (!quantidade || quantidade.isZero()) return erro("Informe a quantidade por unidade, por exemplo 1.");

  const alvos: { produtoId: string; varianteIds: string[] }[] = Array.isArray(body.alvos)
    ? body.alvos
        .filter((a: unknown) => a && typeof a === "object")
        .map((a: { produtoId?: unknown; varianteIds?: unknown }) => ({
          produtoId: String(a.produtoId),
          varianteIds: Array.isArray(a.varianteIds) ? a.varianteIds.map(String) : [],
        }))
    : [];
  if (alvos.length === 0) return erro("Marque pelo menos um produto.");
  if (alvos.length > 300) return erro("Marque no máximo 300 produtos por vez.");

  const resultados = await aplicarMaterial(material.id, quantidade, alvos, body.classificar === true);
  return NextResponse.json({ ok: true, resultados });
}
