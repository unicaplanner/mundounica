import { NextResponse } from "next/server";
import { lerItens, registrarResposta, tokenConfere } from "@/lib/parcerias/formulario";

// Recebe as respostas do Google Forms de permuta. Quem chama e o Apps Script
// da planilha (sem login do Mundo da Unica), entao o proxy deixa passar esta
// rota e a protecao e o token secreto PARCERIAS_FORM_TOKEN.
export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? req.headers.get("x-token");
  if (!tokenConfere(token)) return NextResponse.json({ erro: "Token inválido." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ erro: "Corpo inválido." }, { status: 400 });
  }

  const itens = lerItens(body.respostas);
  if (itens.length === 0) return NextResponse.json({ erro: "Resposta vazia." }, { status: 400 });
  const enviada = new Date(String(body.enviadaEm ?? ""));
  const enviadaEm = Number.isNaN(enviada.getTime()) ? new Date() : enviada;

  const r = await registrarResposta(itens, enviadaEm);
  return NextResponse.json({ ok: true, ligada: Boolean(r.criadoraId), duplicada: r.duplicada });
}
