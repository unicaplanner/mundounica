import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";

// Marca/desmarca uma tarefa avulsa como feita.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  const body = await req.json();
  const feita = body.feita === true;

  const { count } = await prisma.mktTarefa.updateMany({
    where: { id },
    data: { feita, feitaEm: feita ? new Date() : null },
  });
  if (!count) return erro("Essa tarefa não existe mais.", 404);
  return NextResponse.json({ ok: true });
}
