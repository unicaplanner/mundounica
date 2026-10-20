import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { paraDecimal, paraTexto } from "@/lib/financeiro/valores";
import { paraData } from "@/lib/parcerias/leitura";

// Atualiza rastreio, frete e entrega (os itens, se errou, exclui e lanca de novo).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; eid: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id, eid } = await params;
  const body = await req.json();
  const veio = (k: string) => Object.prototype.hasOwnProperty.call(body, k);
  const dados: Prisma.EnvioParceriaUpdateManyMutationInput = {};

  if (veio("rastreio")) dados.rastreio = paraTexto(body.rastreio, 80);
  if (veio("observacao")) dados.observacao = paraTexto(body.observacao, 1000);
  if (veio("custoFrete")) {
    if (String(body.custoFrete ?? "").trim() && !paraDecimal(body.custoFrete)) return erro("Frete inválido.");
    dados.custoFrete = paraDecimal(body.custoFrete);
  }
  for (const k of ["data", "entregueEm"] as const) {
    if (!veio(k)) continue;
    const d = paraData(body[k]);
    if (d === undefined) return erro("Data inválida.");
    if (k === "data") dados.data = d ?? new Date();
    else dados.entregueEm = d;
  }
  await prisma.envioParceria.updateMany({ where: { id: eid, criadoraId: id }, data: dados });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; eid: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id, eid } = await params;
  await prisma.envioParceria.deleteMany({ where: { id: eid, criadoraId: id } });
  return NextResponse.json({ ok: true });
}
