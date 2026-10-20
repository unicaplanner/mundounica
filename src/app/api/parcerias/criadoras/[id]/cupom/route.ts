import { NextResponse } from "next/server";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { atualizarCupons } from "@/lib/parcerias/cupons";

// Busca no Shopify as vendas com o cupom desta criadora.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  try {
    const n = await atualizarCupons(id);
    if (n === 0) return erro("Cadastre o cupom dela primeiro.");
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return erro("Não consegui falar com o Shopify agora. Tente de novo em instantes.", 502);
  }
}
