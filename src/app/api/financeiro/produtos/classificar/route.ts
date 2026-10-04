import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";

const TIPOS = ["revenda", "producao_propria", "kit", "ignorar"] as const;

// Classifica varios produtos de uma vez (mesma regra da classificacao
// individual: so troca o tipo, nao apaga composicao nenhuma). Produto que
// esta dentro de um kit nao vira kit; esses voltam na lista de pulados.
export async function POST(req: Request) {
  if (!(await getUsuario())) return naoAutenticado();
  const body = await req.json();

  const ids: string[] = Array.isArray(body.ids) ? body.ids.map(String) : [];
  if (ids.length === 0) return erro("Marque pelo menos um produto.");
  if (ids.length > 200) return erro("Marque no máximo 200 produtos por vez.");
  if (body.tipo !== null && !TIPOS.includes(body.tipo)) return erro("Tipo de produto inválido.");

  let alvos = ids;
  let pulados: string[] = [];
  if (body.tipo === "kit") {
    const dentroDeKit = await prisma.produto.findMany({
      where: { id: { in: ids }, variantes: { some: { usadaEmKits: { some: {} } } } },
      select: { id: true, title: true },
    });
    const bloqueados = new Set(dentroDeKit.map((p) => p.id));
    alvos = ids.filter((id) => !bloqueados.has(id));
    pulados = dentroDeKit.map((p) => p.title);
  }

  const { count } = await prisma.produto.updateMany({ where: { id: { in: alvos } }, data: { tipo: body.tipo } });
  return NextResponse.json({ ok: true, atualizados: count, pulados });
}
