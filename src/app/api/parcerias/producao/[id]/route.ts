import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { paraTexto } from "@/lib/financeiro/valores";
import { ETAPAS_VALIDAS } from "@/lib/parcerias/etapas";

// Marca como feito (ou desfaz) e edita o texto/etapa de um item da lista.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return erro("Pedido inválido.");

  const dados: Prisma.ItemProducaoParceriaUpdateManyMutationInput = {};
  if (Object.prototype.hasOwnProperty.call(body, "feito")) {
    dados.feito = Boolean(body.feito);
    dados.feitoEm = body.feito ? new Date() : null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "texto")) {
    const t = paraTexto(body.texto, 300);
    if (!t) return erro("Escreva o que precisa ser feito.");
    dados.texto = t;
  }
  if (Object.prototype.hasOwnProperty.call(body, "etapa")) {
    if (!ETAPAS_VALIDAS.includes(String(body.etapa))) return erro("Etapa inválida.");
    dados.etapa = String(body.etapa);
  }

  const r = await prisma.itemProducaoParceria.updateMany({ where: { id }, data: dados });
  if (r.count === 0) return erro("Esse item não existe mais.", 404);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  await prisma.itemProducaoParceria.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
