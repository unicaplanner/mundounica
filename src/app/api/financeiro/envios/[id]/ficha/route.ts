import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { paraDecimal } from "@/lib/financeiro/valores";

// Adiciona um material a embalagem de envio, ou atualiza a quantidade se ele
// ja estiver la (mesmo formato da ficha tecnica do produto).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id: tipoEnvioId } = await params;
  const body = await req.json();

  const quantidade = paraDecimal(body.quantidade);
  if (!quantidade || quantidade.isZero()) return erro("Informe a quantidade, por exemplo 1.");

  const [envio, material] = await Promise.all([
    prisma.tipoEnvio.findUnique({ where: { id: tipoEnvioId }, select: { id: true } }),
    prisma.material.findUnique({ where: { id: String(body.materialId) }, select: { id: true } }),
  ]);
  if (!envio) return erro("Embalagem não encontrada.", 404);
  if (!material) return erro("Escolha um material da lista.");

  await prisma.envioMaterial.upsert({
    where: { tipoEnvioId_materialId: { tipoEnvioId, materialId: material.id } },
    create: { tipoEnvioId, materialId: material.id, quantidade },
    update: { quantidade },
  });
  return NextResponse.json({ ok: true });
}
