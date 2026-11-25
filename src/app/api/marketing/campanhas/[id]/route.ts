import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { lerCampanha } from "@/lib/marketing/edicao";

// Editar ou arquivar uma campanha. Arquivar nao desliga os posts dela.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  const body = await req.json();
  const existe = await prisma.mktCampanha.findUnique({ where: { id }, select: { id: true } });
  if (!existe) return erro("Essa campanha não existe mais.", 404);

  if (body.acao === "arquivar" || body.acao === "desarquivar") {
    await prisma.mktCampanha.update({ where: { id }, data: { arquivadoEm: body.acao === "arquivar" ? new Date() : null } });
    return NextResponse.json({ ok: true });
  }
  const lido = lerCampanha(body);
  if (!lido.ok) return erro(lido.erro);
  const { prazosRegiao, ...resto } = lido.campos;
  await prisma.mktCampanha.update({ where: { id }, data: { ...resto, prazosRegiao: prazosRegiao ?? Prisma.DbNull } });
  return NextResponse.json({ ok: true });
}
