import { NextResponse } from "next/server";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { faturamentoPorMes } from "@/lib/financeiro/faturamento";

export async function GET() {
  if (!(await getUsuario())) return naoAutenticado();
  try {
    return NextResponse.json({ ok: true, meses: await faturamentoPorMes(12) });
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : "Erro desconhecido.";
    return erro(`Não deu pra ler as vendas do Shopify: ${mensagem}`, 502);
  }
}
