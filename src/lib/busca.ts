import { prisma } from "@/lib/db";

// Busca da pagina inicial: procura o texto em todos os modulos de uma vez e
// devolve grupos com link pra cada resultado. Arquivados e concluidos ficam
// de fora. Cada grupo traz no maximo LIMITE itens.

export type ResultadoBusca = { titulo: string; detalhe?: string; href: string };
export type GrupoBusca = { modulo: string; rotulo: string; itens: ResultadoBusca[]; mais: boolean };

const LIMITE = 8;
const dataBR = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });

export async function buscar(texto: string): Promise<GrupoBusca[]> {
  const q = texto.trim().slice(0, 80);
  if (q.length < 2) return [];
  const tem = { contains: q, mode: "insensitive" as const };
  const n = LIMITE + 1;

  const [produtos, materiais, fornecedores, conteudos, criadoras, campanhas, tarefas, tarefasMkt] = await Promise.all([
    prisma.produto.findMany({ where: { title: tem }, select: { id: true, title: true, tipo: true }, orderBy: { title: "asc" }, take: n }),
    prisma.material.findMany({ where: { nome: tem }, select: { id: true, nome: true, unidade: true }, orderBy: { nome: "asc" }, take: n }),
    prisma.fornecedor.findMany({ where: { nome: tem }, select: { id: true, nome: true }, orderBy: { nome: "asc" }, take: n }),
    prisma.mktConteudo.findMany({
      where: { arquivadoEm: null, OR: [{ titulo: tem }, { legenda: tem }, { campanha: tem }] },
      select: { id: true, titulo: true, data: true, canal: true, formato: true },
      orderBy: { data: "desc" },
      take: n,
    }),
    prisma.criadora.findMany({
      where: { OR: [{ nome: tem }, { nomeCompleto: tem }, { instagram: tem }, { tiktok: tem }] },
      select: { id: true, nome: true, nomeCompleto: true, instagram: true },
      orderBy: { updatedAt: "desc" },
      take: n,
    }),
    prisma.campanha.findMany({ where: { OR: [{ nome: tem }, { descricao: tem }] }, select: { id: true, nome: true }, take: n }),
    prisma.tarefa.findMany({
      where: { concluidaEm: null, OR: [{ titulo: tem }, { descricao: tem }] },
      select: { id: true, titulo: true, prazo: true, link: true },
      orderBy: { prazo: "asc" },
      take: n,
    }),
    prisma.mktTarefa.findMany({
      where: { arquivadoEm: null, feita: false, OR: [{ titulo: tem }, { detalhe: tem }] },
      select: { id: true, titulo: true, prazo: true },
      orderBy: { prazo: "asc" },
      take: n,
    }),
  ]);

  const grupo = (modulo: string, rotulo: string, itens: ResultadoBusca[]): GrupoBusca => ({
    modulo,
    rotulo,
    itens: itens.slice(0, LIMITE),
    mais: itens.length > LIMITE,
  });

  return [
    grupo(
      "Tarefas",
      "Tarefas",
      [
        ...tarefas.map((t) => ({
          titulo: t.titulo,
          detalhe: t.prazo ? `prazo ${dataBR.format(t.prazo)}` : undefined,
          href: t.link?.startsWith("/") ? t.link : "/tarefas?visao=lista",
        })),
        ...tarefasMkt.map((t) => ({
          titulo: t.titulo,
          detalhe: `Marketing${t.prazo ? ` · prazo ${dataBR.format(t.prazo)}` : ""}`,
          href: "/marketing/tarefas",
        })),
      ].slice(0, n)
    ),
    grupo(
      "Marketing",
      "Conteúdos",
      conteudos.map((c) => ({ titulo: c.titulo, detalhe: `${dataBR.format(c.data)} · ${c.canal} · ${c.formato}`, href: `/marketing/conteudo/${c.id}` }))
    ),
    grupo(
      "Marketing",
      "Criadoras",
      criadoras.map((c) => ({
        titulo: c.nome ?? c.nomeCompleto ?? (c.instagram ? `@${c.instagram}` : "Sem nome"),
        detalhe: c.instagram ? `@${c.instagram}` : undefined,
        href: `/marketing/parcerias/criadoras/${c.id}`,
      }))
    ),
    grupo("Marketing", "Campanhas", campanhas.map((c) => ({ titulo: c.nome, href: `/marketing/parcerias/campanhas/${c.id}` }))),
    grupo("Financeiro", "Produtos", produtos.map((p) => ({ titulo: p.title, href: `/financeiro/produtos/${p.id}` }))),
    grupo("Financeiro", "Materiais", materiais.map((m) => ({ titulo: m.nome, detalhe: m.unidade, href: `/financeiro/materiais/${m.id}` }))),
    grupo("Financeiro", "Fornecedores", fornecedores.map((f) => ({ titulo: f.nome, href: `/financeiro/fornecedores/${f.id}` }))),
  ].filter((g) => g.itens.length > 0);
}
