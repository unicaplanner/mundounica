import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { lerImpressora } from "@/lib/financeiro/leitura";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  const lido = lerImpressora(await req.json());
  if (!lido.ok) return erro(lido.erro);
  try {
    await prisma.impressora.update({ where: { id }, data: lido.dados });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") return erro("Já existe uma impressora com esse nome.", 409);
      if (e.code === "P2025") return erro("Essa impressora não existe mais.", 404);
    }
    throw e;
  }
}

// Impressora em uso numa ficha nao pode sumir: o custo dos produtos mudaria
// sem a Lari perceber.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  const usos = await prisma.impressaoItem.groupBy({ by: ["produtoId"], where: { impressoraId: id } });
  if (usos.length > 0) {
    return erro(
      `Não dá pra excluir: a impressora está na composição de ${usos.length} ${usos.length === 1 ? "produto" : "produtos"}. Tire ela de lá antes.`,
      409
    );
  }
  await prisma.impressora.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
