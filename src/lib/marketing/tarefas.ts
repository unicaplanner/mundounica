import type { MktCanal, MktStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { diaISO, hojeISO, somarDias } from "./datas";

// A lista "Minhas tarefas" junta duas fontes:
// - o andamento de cada conteudo (aprovar o roteiro, produzir, postar), que
//   sai do status e nao precisa ser marcado em dois lugares;
// - as tarefas avulsas (MktTarefa), que a Lari marca como feitas.

export type TarefaLari = {
  chave: string;
  tipo: string;
  titulo: string;
  detalhe?: string | null;
  prazo: string | null; // AAAA-MM-DD
  links: { href: string; rotulo: string; externo?: boolean }[];
  // avulsa: marca com checkbox; conteudo: avanca o status do conteudo
  origem: { tipo: "avulsa"; id: string; feita: boolean } | { tipo: "conteudo"; id: string; status: MktStatus };
  canal?: MktCanal;
};

// Prazos pra dar tempo antes da data de postar.
const ANTECEDENCIA_APROVAR = 3;
const ANTECEDENCIA_PRODUZIR = 1;

// O prazo de aprovar/produzir e uns dias antes do post, mas so conta como
// atrasado depois que a data do post passou: ate la, vira "hoje". Assim um
// roteiro que acabou de chegar nunca nasce atrasado.
function prazoFolgado(prazo: string, dataDoPost: string, hoje: string) {
  if (prazo >= hoje) return prazo;
  return dataDoPost < hoje ? dataDoPost : hoje;
}

export async function tarefasDaLari({ incluirFeitas = false } = {}): Promise<TarefaLari[]> {
  const [conteudos, avulsas] = await Promise.all([
    prisma.mktConteudo.findMany({
      where: { status: { in: ["roteiro", "aprovado", "gravado"] } },
      orderBy: [{ data: "asc" }, { canal: "asc" }],
      select: {
        id: true,
        data: true,
        canal: true,
        formato: true,
        titulo: true,
        status: true,
        producao: true,
        lote: { select: { pastaDriveUrl: true } },
      },
    }),
    prisma.mktTarefa.findMany({
      where: incluirFeitas ? {} : { feita: false },
      orderBy: [{ prazo: "asc" }, { createdAt: "asc" }],
      include: { conteudo: { select: { id: true, titulo: true } } },
    }),
  ]);

  const lista: TarefaLari[] = [];
  const hoje = hojeISO();

  for (const c of conteudos) {
    const dia = diaISO(c.data);
    const ficha = { href: `/marketing/conteudo/${c.id}`, rotulo: "Abrir a ficha" };
    const nome = `${c.formato}: ${c.titulo}`;
    if (c.status === "roteiro") {
      lista.push({
        chave: `c-${c.id}`,
        tipo: "aprovar",
        titulo: `Aprovar roteiro · ${nome}`,
        prazo: prazoFolgado(somarDias(dia, -ANTECEDENCIA_APROVAR), dia, hoje),
        links: [{ href: `/marketing/conteudo/${c.id}`, rotulo: "Ler e aprovar" }],
        origem: { tipo: "conteudo", id: c.id, status: c.status },
        canal: c.canal,
      });
    } else if (c.status === "aprovado" && c.producao?.trim()) {
      const links: TarefaLari["links"] = [ficha];
      if (c.lote.pastaDriveUrl) links.push({ href: c.lote.pastaDriveUrl, rotulo: "Pasta do Drive", externo: true });
      lista.push({
        chave: `c-${c.id}`,
        tipo: "produzir",
        titulo: `Gravar / fotografar · ${nome}`,
        detalhe: c.producao,
        prazo: prazoFolgado(somarDias(dia, -ANTECEDENCIA_PRODUZIR), dia, hoje),
        links,
        origem: { tipo: "conteudo", id: c.id, status: c.status },
        canal: c.canal,
      });
    } else {
      lista.push({
        chave: `c-${c.id}`,
        tipo: "postar",
        titulo: `Postar · ${nome}`,
        prazo: dia,
        links: [ficha],
        origem: { tipo: "conteudo", id: c.id, status: c.status },
        canal: c.canal,
      });
    }
  }

  for (const t of avulsas) {
    const links: TarefaLari["links"] = [];
    if (t.link) links.push({ href: t.link, rotulo: t.linkRotulo ?? "Abrir", externo: !t.link.startsWith("/") });
    if (t.conteudo) links.push({ href: `/marketing/conteudo/${t.conteudo.id}`, rotulo: "Ver o conteúdo" });
    lista.push({
      chave: `t-${t.id}`,
      tipo: t.tipo,
      titulo: t.titulo,
      detalhe: t.detalhe,
      prazo: t.prazo ? diaISO(t.prazo) : null,
      links,
      origem: { tipo: "avulsa", id: t.id, feita: t.feita },
    });
  }

  // Sem prazo vai pro fim; empate mantem a ordem de chegada.
  return lista.sort((a, b) => (a.prazo ?? "9999").localeCompare(b.prazo ?? "9999"));
}

export async function contarPendentes() {
  const [conteudos, avulsas] = await Promise.all([
    prisma.mktConteudo.count({ where: { status: { in: ["roteiro", "aprovado", "gravado"] } } }),
    prisma.mktTarefa.count({ where: { feita: false } }),
  ]);
  return conteudos + avulsas;
}
