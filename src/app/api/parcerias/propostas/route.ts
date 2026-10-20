import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { extrairDaDm } from "@/lib/parcerias/avaliacao";
import { paraData } from "@/lib/parcerias/leitura";
import { normalizarHandle } from "@/lib/parcerias/perfil";

// Nova proposta: cola a DM, tira o que der do texto e liga na criadora pelo @
// (criando a ficha se ela ainda nao existe).
export async function POST(req: Request) {
  if (!(await getUsuario())) return naoAutenticado();
  const body = await req.json();
  const texto = String(body.texto ?? "").trim().slice(0, 10000);
  if (texto.length < 10) return erro("Cole o texto da DM.");
  const recebidaEm = paraData(body.recebidaEm);
  if (recebidaEm === undefined) return erro("Data inválida.");

  const extraido = extrairDaDm(texto);
  const digitado = String(body.instagram ?? "").trim();
  const handle = digitado ? normalizarHandle(digitado) : extraido.instagram;
  if (digitado && !handle) return erro("Instagram: use só o @ (letras, números, ponto e _).");
  if (!handle) return erro("Não achei o @ dela na mensagem. Digite o Instagram dela.");

  const proposta = await prisma.$transaction(async (tx) => {
    let criadora = await tx.criadora.findUnique({ where: { instagram: handle }, select: { id: true, email: true } });
    if (!criadora) {
      criadora = await tx.criadora.create({
        data: { instagram: handle, origem: "proposta", email: extraido.email },
        select: { id: true, email: true },
      });
    } else if (!criadora.email && extraido.email) {
      await tx.criadora.update({ where: { id: criadora.id }, data: { email: extraido.email } });
    }
    return tx.propostaUgc.create({
      data: {
        criadoraId: criadora.id,
        texto,
        recebidaEm: recebidaEm ?? new Date(),
        pedido: extraido.pedido,
        valorPedido: extraido.valor !== null ? new Prisma.Decimal(extraido.valor) : null,
      },
      select: { id: true },
    });
  });
  return NextResponse.json({ id: proposta.id });
}
