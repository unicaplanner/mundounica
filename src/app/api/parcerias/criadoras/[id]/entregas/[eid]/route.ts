import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { lerEntrega } from "@/lib/parcerias/entregas";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; eid: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id, eid } = await params;
  const lido = lerEntrega(await req.json());
  if (!lido.ok) return erro(lido.erro);

  const atual = await prisma.entregaParceria.findFirst({ where: { id: eid, criadoraId: id }, select: { publicadoEm: true } });
  if (!atual) return erro("Esse post combinado não existe mais.", 404);
  // colou o link do post sem data: conta como publicado hoje
  if (lido.dados.link && lido.dados.publicadoEm === undefined && !atual.publicadoEm) lido.dados.publicadoEm = new Date();

  await prisma.entregaParceria.update({ where: { id: eid }, data: lido.dados });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; eid: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id, eid } = await params;
  await prisma.entregaParceria.deleteMany({ where: { id: eid, criadoraId: id } });
  return NextResponse.json({ ok: true });
}
