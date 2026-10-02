import { NextResponse } from "next/server";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { sincronizarProdutos } from "@/lib/financeiro/sync";

export async function POST() {
  if (!(await getUsuario())) return naoAutenticado();

  try {
    const total = await sincronizarProdutos();
    return NextResponse.json({ ok: true, total });
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : "Erro desconhecido.";
    return erro(`Não deu pra sincronizar com o Shopify: ${mensagem}`, 502);
  }
}
