import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { codigoDe, lerCampanha } from "@/lib/marketing/edicao";

// Nova campanha pela tela.
export async function POST(req: Request) {
  if (!(await getUsuario())) return naoAutenticado();
  const lido = lerCampanha(await req.json());
  if (!lido.ok) return erro(lido.erro);
  const { prazosRegiao, ...resto } = lido.campos;
  const nova = await prisma.mktCampanha.create({
    data: { ...resto, prazosRegiao: prazosRegiao ?? Prisma.DbNull, codigo: codigoDe(resto.nome) },
    select: { id: true },
  });
  return NextResponse.json({ ok: true, id: nova.id });
}

// Lista curta pro seletor de campanha do formulario do post.
export async function GET() {
  if (!(await getUsuario())) return naoAutenticado();
  const lista = await prisma.mktCampanha.findMany({ where: { arquivadoEm: null }, orderBy: [{ inicio: "desc" }, { nome: "asc" }], select: { id: true, nome: true } });
  return NextResponse.json({ ok: true, campanhas: lista });
}
