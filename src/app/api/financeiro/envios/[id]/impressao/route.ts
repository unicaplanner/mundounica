import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { paraDecimal } from "@/lib/financeiro/valores";

// Folhas impressas (frente e verso) em cada pedido dessa embalagem, com o
// custo da impressora mais cara. 0 ou vazio tira a impressao.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id: tipoEnvioId } = await params;
  const body = await req.json();

  const folhas = paraDecimal(body.folhas === "" || body.folhas === undefined ? "0" : body.folhas);
  if (!folhas) return erro("Informe quantas folhas, por exemplo 6.");

  const envio = await prisma.tipoEnvio.findUnique({ where: { id: tipoEnvioId }, select: { id: true } });
  if (!envio) return erro("Embalagem não encontrada.", 404);

  await prisma.$transaction(async (tx) => {
    await tx.envioImpressao.deleteMany({ where: { tipoEnvioId } });
    if (!folhas.isZero()) await tx.envioImpressao.create({ data: { tipoEnvioId, folhas } });
  });
  return NextResponse.json({ ok: true });
}
