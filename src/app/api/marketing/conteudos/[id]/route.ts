import { NextResponse } from "next/server";
import { Prisma, type MktStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { paraLink, paraTexto } from "@/lib/financeiro/valores";

// Andamento de um conteudo: aprovar, pedir ajuste, marcar produzido ou
// publicado, e "voltar um passo" pra desfazer um clique errado.
const VOLTAR: Partial<Record<MktStatus, MktStatus>> = {
  ajustar: "roteiro",
  aprovado: "roteiro",
  gravado: "aprovado",
  publicado: "gravado",
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  const body = await req.json();

  const atual = await prisma.mktConteudo.findUnique({ where: { id }, select: { status: true } });
  if (!atual) return erro("Esse conteúdo não existe mais.", 404);

  let data: Prisma.MktConteudoUpdateInput;
  switch (body.acao) {
    case "aprovar":
      data = { status: "aprovado" };
      break;
    case "ajustar": {
      const nota = paraTexto(body.nota, 2000);
      if (!nota) return erro("Escreva o que você quer mudar.");
      data = { status: "ajustar", notaLari: nota };
      break;
    }
    case "produzido":
      data = { status: "gravado" };
      break;
    case "publicado": {
      const link = paraLink(body.link);
      if (link === undefined) return erro("O link precisa começar com https://.");
      data = { status: "publicado", ...(link ? { linkPublicado: link } : {}) };
      break;
    }
    case "voltar": {
      const anterior = VOLTAR[atual.status];
      if (!anterior) return erro("Não tem passo anterior.");
      data = { status: anterior };
      break;
    }
    default:
      return erro("Ação desconhecida.");
  }

  await prisma.mktConteudo.update({ where: { id }, data: { ...data, statusEm: new Date() } });
  return NextResponse.json({ ok: true });
}
