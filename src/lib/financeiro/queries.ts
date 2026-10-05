import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { impressoraPadrao } from "./impressao";

export type FiltroTipo = "nao_classificados" | "sem_custo" | "producao_propria" | "revenda" | "kit" | "ignorar" | "todos";

// "Nao classificado" ignora produtos arquivados no Shopify: nao faz sentido
// gastar tempo classificando o que nao esta mais a venda.
const NAO_CLASSIFICADO: Prisma.ProdutoWhereInput = {
  tipo: null,
  OR: [{ status: null }, { status: { not: "ARCHIVED" } }],
};

// Todos os produtos do filtro (a loja tem algumas centenas): a tela ordena
// pelos mais vendidos e mostra so o comeco.
export async function getProdutos(opts: { busca?: string; filtro: FiltroTipo }) {
  const where: Prisma.ProdutoWhereInput = {
    ...(opts.busca ? { title: { contains: opts.busca, mode: "insensitive" } } : {}),
    ...(opts.filtro === "nao_classificados"
      ? NAO_CLASSIFICADO
      : opts.filtro === "todos"
        ? {}
        : opts.filtro === "sem_custo"
          ? { tipo: { in: ["producao_propria", "revenda", "kit"] } } // a tela filtra os que tem custo
          : { tipo: opts.filtro }),
  };

  return prisma.produto.findMany({
    where,
    include: { _count: { select: { variantes: { where: { ativa: true } } } } },
    // ACTIVE vem antes de DRAFT em ordem alfabetica: o que esta a venda primeiro.
    orderBy: [{ status: "asc" }, { title: "asc" }],
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
    },
  });
}

// padrao = a impressora cujo custo de folha vale nos produtos e envios.
export async function getImpressoras() {
  const impressoras = await prisma.impressora.findMany({ orderBy: { nome: "asc" } });
  const padrao = impressoraPadrao(impressoras);
  return impressoras.map((i) => ({ ...i, padrao: i.id === padrao?.id }));
}

export async function getCustosFixos() {
  return prisma.custoFixo.findMany({ orderBy: [{ valorMensal: "desc" }, { nome: "asc" }] });
}

export async function getDespesasVariaveis() {
  return prisma.despesaVariavel.findMany({ orderBy: { createdAt: "asc" } });
}

export async function getMateriais() {
  const [materiais, totais, usos, envios] = await Promise.all([
    prisma.material.findMany({ orderBy: { nome: "asc" } }),
    prisma.compra.groupBy({ by: ["materialId"], _sum: { quantidade: true } }),
    // um produto com 6 variantes tem 6 linhas de ficha: conta produtos, nao linhas
    prisma.fichaTecnicaItem.groupBy({ by: ["materialId", "produtoId"] }),
    prisma.envioMaterial.groupBy({ by: ["materialId"], _count: { _all: true } }),
  ]);
  const enviosPorMaterial = new Map(envios.map((e) => [e.materialId, e._count._all]));
  const compradoPorMaterial = new Map(totais.map((t) => [t.materialId, t._sum.quantidade]));
  const produtosPorMaterial = new Map<string, number>();
  for (const u of usos) produtosPorMaterial.set(u.materialId, (produtosPorMaterial.get(u.materialId) ?? 0) + 1);

  return materiais.map((m) => ({
    ...m,
    totalComprado: compradoPorMaterial.get(m.id) ?? new Prisma.Decimal(0),
    produtosQueUsam: produtosPorMaterial.get(m.id) ?? 0,
    enviosQueUsam: enviosPorMaterial.get(m.id) ?? 0,
  }));
}

export async function getComprasRecentes() {
  return prisma.compra.findMany({
    include: { material: true },
    orderBy: [{ data: "desc" }, { createdAt: "desc" }],
    take: 40,
  });
}

// Pra "colocar um material em varios produtos": produtos com variantes ativas
// e quais materiais ja estao na ficha de cada dono (produto ou variante).
export async function getProdutosParaLote() {
  const [produtos, ficha] = await Promise.all([
    prisma.produto.findMany({
      select: {
        id: true,
        title: true,
        tipo: true,
        status: true,
        custoPorVariante: true,
        variantes: { where: { ativa: true }, select: { id: true, title: true }, orderBy: { posicao: "asc" } },
      },
      orderBy: { title: "asc" },
    }),
    prisma.fichaTecnicaItem.findMany({ select: { produtoId: true, varianteId: true, materialId: true } }),
  ]);
  return {
    produtos: produtos
      .filter((p) => p.variantes.length > 0)
      .map((p) => ({
        id: p.id,
        title: p.title,
        tipo: p.tipo,
        arquivado: p.status === "ARCHIVED",
        custoPorVariante: p.custoPorVariante,
        variantes: p.variantes,
      })),
    ficha: ficha.map((f) => [f.produtoId, f.varianteId ?? "", f.materialId] as [string, string, string]),
  };
}
