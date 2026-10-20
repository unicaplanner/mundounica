import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { lerCriadora } from "@/lib/parcerias/leitura";
import { ROTULO_STATUS } from "@/lib/parcerias/rotulos";

// Edita qualquer parte da ficha. Mudar o status marca a data e entra no historico.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  const lido = lerCriadora(await req.json());
  if (!lido.ok) return erro(lido.erro);

  const atual = await prisma.criadora.findUnique({ where: { id }, select: { status: true } });
  if (!atual) return erro("Essa criadora não existe mais.", 404);

  const dados = lido.dados;
  const mudouStatus = dados.status !== undefined && dados.status !== atual.status;
  if (mudouStatus) dados.statusEm = new Date();

  try {
    await prisma.$transaction([
      prisma.criadora.update({ where: { id }, data: dados }),
      ...(mudouStatus
        ? [
            prisma.registroCriadora.create({
              data: { criadoraId: id, texto: `Status: ${ROTULO_STATUS[atual.status]} → ${ROTULO_STATUS[dados.status as keyof typeof ROTULO_STATUS]}` },
            }),
          ]
        : []),
    ]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return erro("Já existe outra criadora com esse @ ou cupom.", 409);
    }
    throw e;
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  await prisma.criadora.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
