import { NextResponse } from "next/server";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { aplicarModelo } from "@/lib/financeiro/composicao";

// Aplica a composicao deste produto em outros (substitui a deles).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  const body = await req.json();

  const destinos: string[] = Array.isArray(body.destinos) ? body.destinos.map(String) : [];
  if (destinos.length === 0) return erro("Marque pelo menos um produto.");
  if (destinos.length > 100) return erro("Marque no máximo 100 produtos por vez.");

  try {
    const resultados = await aplicarModelo(id, destinos);
    return NextResponse.json({ ok: true, resultados });
  } catch (e) {
    return erro(e instanceof Error ? e.message : "Não deu pra aplicar o modelo.");
  }
}
