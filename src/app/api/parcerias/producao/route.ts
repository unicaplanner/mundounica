import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { paraTexto } from "@/lib/financeiro/valores";
import { ETAPAS_VALIDAS } from "@/lib/parcerias/etapas";
import { gerarChecklist, gerarParaFechadas } from "@/lib/parcerias/producao";

// Duas coisas:
// - { acao: "gerar", criadoraId? , campanhaId? }: cria a lista a partir do
//   modelo (de uma criadora, ou de todas que fecharam e ainda nao tem lista);
// - { criadoraId, etapa, texto }: acrescenta um item avulso na lista dela.
export async function POST(req: Request) {
  if (!(await getUsuario())) return naoAutenticado();
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return erro("Pedido inválido.");

  if (body.acao === "gerar") {
    const criadoraId = paraTexto(body.criadoraId, 40);
    const criadas = criadoraId ? await gerarChecklist(criadoraId) : await gerarParaFechadas(paraTexto(body.campanhaId, 40) ?? undefined);
    return NextResponse.json({ ok: true, criadas });
  }

  const criadoraId = paraTexto(body.criadoraId, 40);
  const etapa = String(body.etapa ?? "");
  const texto = paraTexto(body.texto, 300);
  if (!criadoraId) return erro("Escolha a criadora.");
  if (!ETAPAS_VALIDAS.includes(etapa)) return erro("Etapa inválida.");
  if (!texto) return erro("Escreva o que precisa ser feito.");

  const criadora = await prisma.criadora.findUnique({ where: { id: criadoraId }, select: { id: true } });
  if (!criadora) return erro("Criadora não encontrada.", 404);
  const ultimo = await prisma.itemProducaoParceria.aggregate({ where: { criadoraId }, _max: { posicao: true } });
  await prisma.itemProducaoParceria.create({ data: { criadoraId, etapa, texto, posicao: (ultimo._max.posicao ?? -1) + 1 } });
  return NextResponse.json({ ok: true });
}
