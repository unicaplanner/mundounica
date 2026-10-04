import { NextResponse } from "next/server";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { sincronizarProdutos } from "@/lib/financeiro/sync";
import { sincronizarVendas } from "@/lib/financeiro/vendas";

// Puxar 12 meses de pedidos leva alguns segundos; folga pro limite da Vercel.
export const maxDuration = 120;

// Produtos primeiro, pra que as vendas encontrem as variantes novas.
export async function POST() {
  if (!(await getUsuario())) return naoAutenticado();

  try {
    const { produtos, variantes } = await sincronizarProdutos();
    const { pedidos } = await sincronizarVendas();
    return NextResponse.json({ ok: true, produtos, variantes, pedidos });
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : "Erro desconhecido.";
    return erro(`Não deu pra sincronizar com o Shopify: ${mensagem}`, 502);
  }
}
