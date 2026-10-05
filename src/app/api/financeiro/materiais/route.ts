import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { VALORES_UNIDADE } from "@/lib/financeiro/unidades";
import { paraLink } from "@/lib/financeiro/valores";

export async function POST(req: Request) {
  if (!(await getUsuario())) return naoAutenticado();
  const { nome, unidade, linkCompra, impresso } = await req.json();

  const nomeLimpo = String(nome ?? "").trim();
  if (!nomeLimpo) return erro("Dê um nome pro material.");
  if (!VALORES_UNIDADE.includes(unidade)) return erro("Escolha uma unidade da lista.");
  const link = paraLink(linkCompra);
  if (link === undefined) return erro("O link de compra precisa começar com https://, por exemplo o endereço do anúncio.");

  try {
    const material = await prisma.material.create({ data: { nome: nomeLimpo, unidade, linkCompra: link, impresso: unidade === "folha" && impresso === true } });
    return NextResponse.json({ ok: true, id: material.id });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return erro("Já existe um material com esse nome.", 409);
    }
    throw e;
  }
}
