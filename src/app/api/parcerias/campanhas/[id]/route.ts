import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { lerCampanha } from "@/lib/parcerias/campanhas";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  const lido = lerCampanha(await req.json());
  if (!lido.ok) return erro(lido.erro);
  try {
    await prisma.campanha.update({ where: { id }, data: lido.dados });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") return erro("Já existe uma campanha com esse nome.", 409);
      if (e.code === "P2025") return erro("Essa campanha não existe mais.", 404);
    }
    throw e;
  }
}

// As criadoras ficam (so saem da campanha); as tarefas vao junto.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  await prisma.campanha.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
