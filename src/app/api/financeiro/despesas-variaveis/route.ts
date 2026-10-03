import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { lerDespesaVariavel } from "@/lib/financeiro/leitura";

export async function POST(req: Request) {
  if (!(await getUsuario())) return naoAutenticado();
  const lido = lerDespesaVariavel(await req.json());
  if (!lido.ok) return erro(lido.erro);
  await prisma.despesaVariavel.create({ data: lido.dados });
  return NextResponse.json({ ok: true });
}
