import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { paraTexto } from "@/lib/financeiro/valores";
import { codigoDe, comoDia, ehDia } from "@/lib/marketing/edicao";

const TIPOS = ["marca", "recesso", "pico", "sazonal", "feriado"];

// Nova data da marca (aparece no calendario).
export async function POST(req: Request) {
  if (!(await getUsuario())) return naoAutenticado();
  const b = await req.json();
  const titulo = paraTexto(b.titulo, 120);
  if (!titulo) return erro("Dê um nome pra data.");
  if (!ehDia(b.inicio)) return erro("Escolha o dia.");
  if (b.fim && (!ehDia(b.fim) || b.fim < b.inicio)) return erro("O fim precisa ser depois do início.");
  const nova = await prisma.mktData.create({
    data: {
      codigo: codigoDe(titulo),
      titulo,
      tipo: TIPOS.includes(b.tipo) ? b.tipo : "marca",
      inicio: comoDia(b.inicio),
      fim: b.fim ? comoDia(b.fim) : null,
      nota: paraTexto(b.nota, 1000),
      recorrente: b.recorrente === true,
    },
    select: { id: true },
  });
  return NextResponse.json({ ok: true, id: nova.id });
}
