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

// A impressao nas fichas nao depende de uma impressora (usa a mais cara),
// entao excluir so solta a referencia antiga dos itens de antes dessa mudanca.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  await prisma.$transaction([
    prisma.impressaoItem.updateMany({ where: { impressoraId: id }, data: { impressoraId: null } }),
    prisma.envioImpressao.updateMany({ where: { impressoraId: id }, data: { impressoraId: null } }),
    prisma.impressora.deleteMany({ where: { id } }),
  ]);
  return NextResponse.json({ ok: true });
}
