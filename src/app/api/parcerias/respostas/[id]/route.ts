import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { camposDoFormulario, completarFicha, type ItemResposta } from "@/lib/parcerias/formulario";

// Liga na mao uma resposta do formulario cujo @ nao bateu com ninguem
// (ou cria a ficha dela a partir da resposta).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  const body = await req.json();

  const resposta = await prisma.respostaFormulario.findUnique({ where: { id } });
  if (!resposta) return erro("Essa resposta não existe mais.", 404);
  const campos = camposDoFormulario(resposta.respostas as ItemResposta[]);

  let criadoraId = String(body.criadoraId ?? "").trim();
  if (body.criar) {
    if (campos.handle && (await prisma.criadora.findUnique({ where: { instagram: campos.handle }, select: { id: true } }))) {
      return erro("Já existe uma criadora com esse @. Escolha ela na lista.", 409);
    }
  } else if (!criadoraId || !(await prisma.criadora.findUnique({ where: { id: criadoraId }, select: { id: true } }))) {
    return erro("Escolha a criadora.");
  }

  await prisma.$transaction(async (tx) => {
    if (body.criar) {
      const nova = await tx.criadora.create({
        data: { instagram: campos.handle, nome: campos.nomeCompleto?.split(" ")[0] ?? null },
        select: { id: true },
      });
      criadoraId = nova.id;
    }
    await tx.respostaFormulario.update({ where: { id }, data: { criadoraId } });
    await completarFicha(tx, criadoraId, campos, resposta.enviadaEm);
  });
  return NextResponse.json({ ok: true, criadoraId });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  await prisma.respostaFormulario.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
