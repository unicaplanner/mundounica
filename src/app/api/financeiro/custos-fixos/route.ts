import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { lerCustoFixo } from "@/lib/financeiro/leitura";

export async function POST(req: Request) {
  if (!(await getUsuario())) return naoAutenticado();
  const lido = lerCustoFixo(await req.json());
  if (!lido.ok) return erro(lido.erro);
  await prisma.custoFixo.create({ data: lido.dados });
  return NextResponse.json({ ok: true });
}
