import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { lerCampanha } from "@/lib/parcerias/campanhas";

export async function POST(req: Request) {
  if (!(await getUsuario())) return naoAutenticado();
  const lido = lerCampanha(await req.json());
  if (!lido.ok) return erro(lido.erro);
  if (!lido.dados.nome) return erro("Dê um nome pra campanha (ex: Onda 2).");
  try {
    const c = await prisma.campanha.create({ data: { ...lido.dados, nome: lido.dados.nome }, select: { id: true } });
    return NextResponse.json({ id: c.id });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return erro("Já existe uma campanha com esse nome.", 409);
    throw e;
  }
}
