import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { paraDecimal, paraTexto } from "@/lib/financeiro/valores";

// Atualiza nome, regra de uso, % dos pedidos e/ou tempo de embalar de uma embalagem.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  const body = await req.json();

  const data: Prisma.TipoEnvioUpdateInput = {};
  if ("nome" in body) {
    const nome = paraTexto(body.nome, 60);
    if (!nome) return erro("Dê um nome pra embalagem.");
    data.nome = nome;
  }
  if ("quando" in body) data.quando = paraTexto(body.quando, 200);
  if ("minutos" in body) {
    if (body.minutos === null || body.minutos === "") data.minutos = null;
    else {
      const minutos = paraDecimal(body.minutos);
      if (!minutos) return erro("Informe o tempo em minutos, por exemplo 5.");
      data.minutos = minutos;
    }
  }
  if ("percentual" in body) {
    const percentual = paraDecimal(body.percentual === "" ? "0" : body.percentual);
    if (!percentual || percentual.gt(100)) return erro("O % dos pedidos precisa ser um número de 0 a 100.");
    data.percentual = percentual;
  }

  try {
    await prisma.tipoEnvio.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") return erro("Já existe uma embalagem com esse nome.", 409);
      if (e.code === "P2025") return erro("Essa embalagem não existe mais.", 404);
    }
    throw e;
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  await prisma.tipoEnvio.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
