import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { comoDia, lerCampos, loteDaData, novoCodigo, statusInicial } from "@/lib/marketing/edicao";

// "Novo post" pela tela do calendario.
export async function POST(req: Request) {
  if (!(await getUsuario())) return naoAutenticado();
  const lido = lerCampos(await req.json());
  if (!lido.ok) return erro(lido.erro);
  const { data, ...resto } = lido.campos;

  const criado = await prisma.mktConteudo.create({
    data: { ...resto, codigo: novoCodigo(), data: comoDia(data), loteId: await loteDaData(data), status: statusInicial(resto), statusEm: new Date() },
    select: { id: true },
  });
  return NextResponse.json({ ok: true, id: criado.id });
}
