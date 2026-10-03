import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const PAGINA = 60;

export type FiltroTipo = "nao_classificados" | "producao_propria" | "revenda" | "kit" | "todos";

// "Nao classificado" ignora produtos arquivados no Shopify: nao faz sentido
// gastar tempo classificando o que nao esta mais a venda.
const NAO_CLASSIFICADO: Prisma.ProdutoWhereInput = {
  tipo: null,
  OR: [{ status: null }, { status: { not: "ARCHIVED" } }],
};

export async function getProdutos(opts: { busca?: string; filtro: FiltroTipo }) {
  const where: Prisma.ProdutoWhereInput = {
    ...(opts.busca ? { title: { contains: opts.busca, mode: "insensitive" } } : {}),
    ...(opts.filtro === "nao_classificados"
      ? NAO_CLASSIFICADO
      : opts.filtro === "todos"
        ? {}
        : { tipo: opts.filtro }),
  };

  return prisma.produto.findMany({
    where,
    include: { _count: { select: { variantes: { where: { ativa: true } } } } },
    // ACTIVE vem antes de DRAFT em ordem alfabetica: o que esta a venda primeiro.
    orderBy: [{ status: "asc" }, { title: "asc" }],
    take: PAGINA,
  });
}

export async function getResumoProdutos() {
  const [naoClassificados, total, ultimaSync] = await Promise.all([
    prisma.produto.count({ where: NAO_CLASSIFICADO }),
    prisma.produto.count(),
    prisma.produto.aggregate({ _max: { lastSyncedAt: true } }),
  ]);
  return { naoClassificados, total, ultimaSync: ultimaSync._max.lastSyncedAt };
}

export async function getProduto(id: string) {
  return prisma.produto.findUnique({
    where: { id },
    include: {
      variantes: { where: { ativa: true }, orderBy: { posicao: "asc" } },
      fichaTecnica: { include: { material: true }, orderBy: { material: { nome: "asc" } } },
      componentes: {
        include: { componente: { include: { produto: { select: { title: true } } } } },
        orderBy: { createdAt: "asc" },
      },
      impressoes: { include: { impressora: true }, orderBy: { createdAt: "asc" } },
    },
  });
}

export async function getImpressoras() {
  const [impressoras, usos] = await Promise.all([
    prisma.impressora.findMany({ orderBy: { nome: "asc" } }),
    prisma.impressaoItem.groupBy({ by: ["impressoraId", "produtoId"] }),
  ]);
  const produtosPorImpressora = new Map<string, number>();
  for (const u of usos) produtosPorImpressora.set(u.impressoraId, (produtosPorImpressora.get(u.impressoraId) ?? 0) + 1);
  return impressoras.map((i) => ({ ...i, produtosQueUsam: produtosPorImpressora.get(i.id) ?? 0 }));
}

export async function getCustosFixos() {
  return prisma.custoFixo.findMany({ orderBy: [{ valorMensal: "desc" }, { nome: "asc" }] });
}

export async function getDespesasVariaveis() {
  return prisma.despesaVariavel.findMany({ orderBy: { createdAt: "asc" } });
}

export async function getMateriais() {
  const [materiais, totais, usos] = await Promise.all([
    prisma.material.findMany({ orderBy: { nome: "asc" } }),
    prisma.compra.groupBy({ by: ["materialId"], _sum: { quantidade: true } }),
    // um produto com 6 variantes tem 6 linhas de ficha: conta produtos, nao linhas
    prisma.fichaTecnicaItem.groupBy({ by: ["materialId", "produtoId"] }),
  ]);
  const compradoPorMaterial = new Map(totais.map((t) => [t.materialId, t._sum.quantidade]));
  const produtosPorMaterial = new Map<string, number>();
  for (const u of usos) produtosPorMaterial.set(u.materialId, (produtosPorMaterial.get(u.materialId) ?? 0) + 1);

  return materiais.map((m) => ({
    ...m,
    totalComprado: compradoPorMaterial.get(m.id) ?? new Prisma.Decimal(0),
    produtosQueUsam: produtosPorMaterial.get(m.id) ?? 0,
  }));
}

export async function getComprasRecentes() {
  return prisma.compra.findMany({
    include: { material: true },
    orderBy: [{ data: "desc" }, { createdAt: "desc" }],
    take: 40,
  });
}
