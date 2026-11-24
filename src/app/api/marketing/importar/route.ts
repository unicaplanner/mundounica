import { NextResponse } from "next/server";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { gravarPlano, preverPlano } from "@/lib/marketing/plano";

// "Importar plano": { plano, gravar }. Sem gravar, so devolve a previa.
export async function POST(req: Request) {
  if (!(await getUsuario())) return naoAutenticado();
  const body = await req.json().catch(() => null);
  if (!body || body.plano === undefined) return erro("Cole o plano (o JSON do lote).");

  if (!body.gravar) return NextResponse.json({ ok: true, previa: await preverPlano(body.plano) });

  const { previa, gravado } = await gravarPlano(body.plano);
  if (!gravado) return NextResponse.json({ ok: false, previa, erro: "O plano tem erros: corrija antes de gravar." }, { status: 400 });
  return NextResponse.json({ ok: true, previa });
}
