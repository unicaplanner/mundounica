import { NextResponse } from "next/server";
import { Prisma, type MktStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { paraLink, paraTexto } from "@/lib/financeiro/valores";
import { comoDia, ehDia, lerCampos, loteDaData, novoCodigo, statusInicial } from "@/lib/marketing/edicao";

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

  const atual = await prisma.mktConteudo.findUnique({ where: { id } });
  if (!atual) return erro("Esse conteúdo não existe mais.", 404);

  // Edicao pela tela: mudam os campos (e o lote, se a data mudar de faixa),
  // nunca o andamento.
  if (body.acao === "editar") {
    const lido = lerCampos(body);
    if (!lido.ok) return erro(lido.erro);
    const { data, ...resto } = lido.campos;
    await prisma.mktConteudo.update({ where: { id }, data: { ...resto, data: comoDia(data), loteId: await loteDaData(data) } });
    return NextResponse.json({ ok: true });
  }
  if (body.acao === "remarcar") {
    if (!ehDia(body.data)) return erro("Escolha o novo dia.");
    await prisma.mktConteudo.update({ where: { id }, data: { data: comoDia(body.data), loteId: await loteDaData(body.data) } });
    return NextResponse.json({ ok: true });
  }
  if (body.acao === "duplicar") {
    // Copia o conteudo e a arte; andamento, link publicado e notas ficam no original.
    const { data, horario, canal, formato, nivel, pilar, campanha, objetivo, gancho, roteiro, legenda, cta, hashtags, producao, produtos, reaproveita, observacao, linkCanva, perfil, loteId, campanhaId } = atual;
    const novo = await prisma.mktConteudo.create({
      data: { data, horario, canal, formato, nivel, pilar, campanha, objetivo, gancho, roteiro: roteiro ?? undefined, legenda, cta, hashtags, producao, produtos, reaproveita, observacao, linkCanva, perfil, loteId, campanhaId, codigo: novoCodigo(), titulo: `${atual.titulo} (cópia)`, status: statusInicial(atual), statusEm: new Date() },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, id: novo.id });
  }
  // "Nao vou postar" tambem arquiva: some do calendario e das tarefas, o historico fica.
  if (body.acao === "arquivar" || body.acao === "desarquivar") {
    await prisma.mktConteudo.update({ where: { id }, data: { arquivadoEm: body.acao === "arquivar" ? new Date() : null } });
    return NextResponse.json({ ok: true });
  }

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
      // "Postei em": a data real do post substitui a planejada.
      const dataReal = ehDia(body.dataReal) ? body.dataReal : null;
      data = {
        status: "publicado",
        ...(link ? { linkPublicado: link } : {}),
        ...(dataReal ? { data: comoDia(dataReal), lote: { connect: { id: await loteDaData(dataReal) } } } : {}),
      };
      break;
    }
    case "canva": {
      const link = paraLink(body.link);
      if (link === undefined) return erro("O link precisa começar com https://.");
      // So guarda o link, sem mexer no andamento.
      await prisma.mktConteudo.update({ where: { id }, data: { linkCanva: link } });
      return NextResponse.json({ ok: true });
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
