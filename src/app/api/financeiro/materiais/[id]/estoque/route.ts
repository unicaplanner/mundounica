import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { paraDecimal } from "@/lib/financeiro/valores";

// Registra uma contagem de estoque do material (quantidade na unidade dele e
// a data da contagem). A partir dela o sistema vai dando baixa pelas vendas.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  const body = await req.json();
  const quantidade = paraDecimal(body.quantidade === "" ? null : body.quantidade);
  if (!quantidade) return erro("Informe quanto tem em estoque, por exemplo 1500.");
  const data = body.data ? new Date(`${body.data}T12:00:00`) : new Date();
  if (Number.isNaN(data.getTime())) return erro("Data inválida.");
  const atualizado = await prisma.material
    .update({ where: { id }, data: { estoqueContado: quantidade, estoqueContadoEm: data } })
    .catch(() => null);
  if (!atualizado) return erro("Material não encontrado.", 404);
  return NextResponse.json({ ok: true });
}
