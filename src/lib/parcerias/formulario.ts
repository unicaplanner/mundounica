import { createHash, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { normalizarBusca } from "@/lib/financeiro/formato";
import { lerPerfil, normalizarHandle } from "./perfil";

// Resposta do Google Forms de permuta, enviada pelo Apps Script da planilha.
// Nao conhecemos as perguntas exatas (a Lari pode mudar o form), entao os
// campos sao achados pelo texto da pergunta e a resposta inteira fica guardada.

export type ItemResposta = { pergunta: string; resposta: string };

export function tokenConfere(recebido: string | null) {
  const esperado = process.env.PARCERIAS_FORM_TOKEN?.trim();
  if (!esperado || !recebido) return false;
  const a = createHash("sha256").update(recebido).digest();
  const b = createHash("sha256").update(esperado).digest();
  return timingSafeEqual(a, b);
}

export function lerItens(respostas: unknown): ItemResposta[] {
  if (!respostas || typeof respostas !== "object") return [];
  return Object.entries(respostas as Record<string, unknown>)
    .map(([pergunta, valor]) => ({
      pergunta: pergunta.trim().slice(0, 300),
      resposta: (Array.isArray(valor) ? valor.join(", ") : String(valor ?? "")).trim().slice(0, 3000),
    }))
    .filter((i) => i.pergunta && i.resposta && !/^(carimbo|timestamp|data\/hora)/i.test(i.pergunta));
}

const tem = (i: ItemResposta, ...palavras: string[]) => palavras.some((p) => normalizarBusca(i.pergunta).includes(p));

export function camposDoFormulario(itens: ItemResposta[]) {
  const achar = (...palavras: string[]) => itens.find((i) => tem(i, ...palavras))?.resposta ?? null;

  const insta = achar("instagram", "@", "perfil", "usuario");
  const handle = insta ? (lerPerfil(insta)?.handle ?? normalizarHandle(insta.split(/\s/)[0])) : null;

  const email = itens.map((i) => i.resposta.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0]).find(Boolean) ?? null;
  const telefone = achar("whats", "telefone", "celular", "contato");
  const whatsapp = telefone ? telefone.replace(/\D/g, "").slice(-13) || null : null;

  const nomeCompleto = itens.find((i) => tem(i, "nome") && !tem(i, "instagram", "usuario", "@"))?.resposta ?? null;

  // Endereco pode vir num campo so ou quebrado (rua, numero, bairro, CEP...).
  const partesEndereco = itens.filter((i) => tem(i, "endereco", "rua", "numero", "complemento", "bairro", "cidade", "estado", "uf", "cep"));
  const endereco = partesEndereco.length
    ? partesEndereco.length === 1
      ? partesEndereco[0].resposta
      : partesEndereco.map((i) => `${i.pergunta.replace(/\?$/, "")}: ${i.resposta}`).join("\n")
    : null;

  return { instaDigitado: insta, handle, email, whatsapp: whatsapp && whatsapp.length >= 10 ? whatsapp : null, nomeCompleto, endereco };
}

// Grava a resposta e, se achar a criadora pelo @, completa a ficha dela
// (so os campos vazios: o que a Lari corrigiu a mao nao e sobrescrito).
export async function registrarResposta(itens: ItemResposta[], enviadaEm: Date) {
  const campos = camposDoFormulario(itens);
  // Mesma linha da planilha = mesmo carimbo de data/hora + mesmo @, venha do
  // gatilho do formulario ou do "enviar todas" (que formata os valores diferente).
  const chave = createHash("sha256")
    .update(`${Math.floor(enviadaEm.getTime() / 1000)}|${campos.instaDigitado ?? JSON.stringify(itens)}`)
    .digest("hex");

  const existente = await prisma.respostaFormulario.findUnique({ where: { chave }, select: { id: true } });
  if (existente) return { duplicada: true, criadoraId: null };

  const criadora = campos.handle ? await prisma.criadora.findUnique({ where: { instagram: campos.handle } }) : null;

  await prisma.$transaction(async (tx) => {
    await tx.respostaFormulario.create({
      data: {
        chave,
        enviadaEm,
        instagram: campos.instaDigitado?.slice(0, 120) ?? null,
        respostas: itens as unknown as Prisma.InputJsonValue,
        criadoraId: criadora?.id ?? null,
      },
    });
    if (criadora) await completarFicha(tx, criadora.id, campos, enviadaEm);
  });

  return { duplicada: false, criadoraId: criadora?.id ?? null };
}

export async function completarFicha(
  tx: Prisma.TransactionClient,
  criadoraId: string,
  campos: ReturnType<typeof camposDoFormulario>,
  enviadaEm: Date
) {
  const c = await tx.criadora.findUniqueOrThrow({ where: { id: criadoraId } });
  await tx.criadora.update({
    where: { id: criadoraId },
    data: {
      nomeCompleto: c.nomeCompleto ?? campos.nomeCompleto,
      email: c.email ?? campos.email,
      whatsapp: c.whatsapp ?? campos.whatsapp,
      endereco: c.endereco ?? campos.endereco,
      // preencher o formulario de permuta = topou a parceria
      ...(c.status !== "fechada" ? { status: "fechada", statusEm: enviadaEm } : {}),
      acordo: c.acordo ?? "permuta",
    },
  });
  await tx.registroCriadora.create({
    data: { criadoraId, data: enviadaEm, texto: "Preencheu o formulário de permuta." },
  });
}
