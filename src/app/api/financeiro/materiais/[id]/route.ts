import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { VALORES_UNIDADE } from "@/lib/financeiro/unidades";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  const { nome, unidade } = await req.json();

  const nomeLimpo = String(nome ?? "").trim();
  if (!nomeLimpo) return erro("Dê um nome pro material.");
  if (!VALORES_UNIDADE.includes(unidade)) return erro("Escolha uma unidade da lista.");

  try {
    await prisma.material.update({ where: { id }, data: { nome: nomeLimpo, unidade } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") return erro("Já existe um material com esse nome.", 409);
      if (e.code === "P2025") return erro("Esse material não existe mais.", 404);
    }
    throw e;
  }
}

// So exclui material sem historico: apagar um material com compras ou em
// ficha tecnica mudaria o custo de produtos sem a Lari perceber.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;

  const material = await prisma.material.findUnique({
    where: { id },
    select: { _count: { select: { compras: true, fichaTecnica: true } } },
  });
  if (!material) return NextResponse.json({ ok: true });

  const { compras, fichaTecnica } = material._count;
  if (compras > 0 || fichaTecnica > 0) {
    const motivos = [
      compras > 0 && `${compras} ${compras === 1 ? "compra" : "compras"}`,
      fichaTecnica > 0 && `${fichaTecnica} ${fichaTecnica === 1 ? "ficha técnica" : "fichas técnicas"}`,
    ].filter(Boolean);
    return erro(
      `Não dá pra excluir: o material aparece em ${motivos.join(" e ")}. Remova esses registros antes.`,
      409
    );
  }

  await prisma.material.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
