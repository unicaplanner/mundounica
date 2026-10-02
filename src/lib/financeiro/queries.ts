import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const PAGINA = 60;

export type FiltroTipo = "nao_classificados" | "producao_propria" | "revenda" | "todos";

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
    include: { fichaTecnica: { include: { material: true } } },
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
    include: { fichaTecnica: { include: { material: true }, orderBy: { material: { nome: "asc" } } } },
  });
}

export async function getMateriais() {
  const [materiais, totais] = await Promise.all([
    prisma.material.findMany({
      orderBy: { nome: "asc" },
      include: { _count: { select: { fichaTecnica: true } } },
    }),
    prisma.compra.groupBy({ by: ["materialId"], _sum: { quantidade: true } }),
  ]);
  const compradoPorMaterial = new Map(totais.map((t) => [t.materialId, t._sum.quantidade]));
  return materiais.map((m) => ({
    ...m,
    totalComprado: compradoPorMaterial.get(m.id) ?? new Prisma.Decimal(0),
  }));
}

export async function getComprasRecentes() {
  return prisma.compra.findMany({
    include: { material: true },
    orderBy: [{ data: "desc" }, { createdAt: "desc" }],
    take: 40,
  });
}
