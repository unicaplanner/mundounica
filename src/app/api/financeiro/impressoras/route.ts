import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { lerImpressora } from "@/lib/financeiro/leitura";

export async function POST(req: Request) {
  if (!(await getUsuario())) return naoAutenticado();
  const lido = lerImpressora(await req.json());
  if (!lido.ok) return erro(lido.erro);
  try {
    await prisma.impressora.create({ data: lido.dados });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return erro("Já existe uma impressora com esse nome.", 409);
    }
    throw e;
  }
}
