import { NextResponse } from "next/server";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { atualizarCupons } from "@/lib/parcerias/cupons";

// Atualiza as vendas de todos os cupons de criadoras.
export async function POST() {
  if (!(await getUsuario())) return naoAutenticado();
  try {
    const n = await atualizarCupons();
    return NextResponse.json({ ok: true, atualizadas: n });
  } catch (e) {
    console.error(e);
    return erro("Não consegui falar com o Shopify agora. Tente de novo em instantes.", 502);
  }
}
