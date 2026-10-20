import { NextResponse } from "next/server";
import type { Prisma, Recomendacao, StatusCriadora } from "@prisma/client";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { paraDecimal, paraTexto } from "@/lib/financeiro/valores";
import { lerChecklist } from "@/lib/parcerias/avaliacao";
import { ROTULO_RECOMENDACAO } from "@/lib/parcerias/rotulos";

const RECOMENDACOES: Recomendacao[] = ["aprovar", "investigar", "recusar"];
const ANTES_DE_NEGOCIAR: StatusCriadora[] = ["nova", "pra_contatar", "contatada", "respondeu"];

// Salva o checklist e, quando a Lari decide, move a criadora no funil:
// aprovar -> em negociacao; recusar -> nao seguiu; investigar -> fica onde esta.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  const body = await req.json();
  const veio = (k: string) => Object.prototype.hasOwnProperty.call(body, k);

  const proposta = await prisma.propostaUgc.findUnique({
    where: { id },
    select: { criadoraId: true, checklist: true, criadora: { select: { status: true } } },
  });
  if (!proposta) return erro("Essa proposta não existe mais.", 404);

  const dados: Prisma.PropostaUgcUpdateInput = {};
  if (veio("checklist")) {
    // guarda junto a sugestao do Claude, se houver
    const anterior = (proposta.checklist ?? {}) as Record<string, unknown>;
    dados.checklist = { ...lerChecklist(body.checklist), ...(anterior._claude ? { _claude: anterior._claude } : {}) };
  }
  if (veio("justificativa")) dados.justificativa = paraTexto(body.justificativa, 3000);
  if (veio("perguntas")) dados.perguntas = paraTexto(body.perguntas, 3000);
  if (veio("pedido")) dados.pedido = ["pago", "permuta"].includes(body.pedido) ? body.pedido : null;
  if (veio("valorPedido")) {
    if (String(body.valorPedido ?? "").trim() && !paraDecimal(body.valorPedido)) return erro("Valor inválido.");
    dados.valorPedido = paraDecimal(body.valorPedido);
  }

  const ops: Prisma.PrismaPromise<unknown>[] = [];
  if (veio("recomendacao")) {
    const r = body.recomendacao || null;
    if (r !== null && !RECOMENDACOES.includes(r)) return erro("Recomendação inválida.");
    dados.recomendacao = r;
    if (r) {
      dados.analisadaEm = new Date();
      if (!veio("analisadaPor")) dados.analisadaPor = "manual";
      const status = proposta.criadora.status;
      let novo: StatusCriadora | null = null;
      if (r === "aprovar" && ANTES_DE_NEGOCIAR.includes(status)) novo = "negociando";
      if (r === "recusar" && status !== "fechada") novo = "nao_seguiu";
      if (novo && novo !== status) {
        ops.push(prisma.criadora.update({ where: { id: proposta.criadoraId }, data: { status: novo, statusEm: new Date() } }));
      }
      ops.push(
        prisma.registroCriadora.create({
          data: { criadoraId: proposta.criadoraId, texto: `Proposta avaliada: ${ROTULO_RECOMENDACAO[r as Recomendacao]}.` },
        })
      );
    }
  }

  await prisma.$transaction([prisma.propostaUgc.update({ where: { id }, data: dados }), ...ops]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  await prisma.propostaUgc.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
