import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { shopifyGraphQL } from "./shopify";

type ItemPedido = {
  title: string;
  currentQuantity: number;
  variant: { id: string } | null;
  product: { id: string } | null;
  discountedUnitPriceAfterAllDiscountsSet: { shopMoney: { amount: string } };
};

type Itens = { nodes: ItemPedido[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };

type Pedido = { id: string; createdAt: string; cancelledAt: string | null; test: boolean; lineItems: Itens };

interface PedidosResponse {
  orders: { nodes: Pedido[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
}

interface ItensResponse {
  order: { lineItems: Itens } | null;
}

const ITENS = /* GraphQL */ `
  nodes {
    title
    currentQuantity
    variant {
      id
    }
    product {
      id
    }
    discountedUnitPriceAfterAllDiscountsSet {
      shopMoney {
        amount
      }
    }
  }
  pageInfo {
    hasNextPage
    endCursor
  }
`;

const PEDIDOS_QUERY = /* GraphQL */ `
  query VendasPedidos($cursor: String, $filtro: String!) {
    orders(first: 25, after: $cursor, query: $filtro, sortKey: CREATED_AT) {
      nodes {
        id
        createdAt
        cancelledAt
        test
        lineItems(first: 100) { ${ITENS} }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

// Pedido com mais de 100 itens: busca o resto separado.
const ITENS_QUERY = /* GraphQL */ `
  query VendasItens($id: ID!, $cursor: String) {
    order(id: $id) {
      lineItems(first: 100, after: $cursor) { ${ITENS} }
    }
  }
`;

const mesSP = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" });

const chaveMes = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

// Os ultimos `meses` meses completos (sem o mes corrente), do mais antigo pro mais novo.
export function mesesCompletos(meses = 12): string[] {
  const [ano, mes] = mesSP.format(new Date()).split("-").map(Number);
  return Array.from({ length: meses }, (_, i) => chaveMes(new Date(Date.UTC(ano, mes - 1 - meses + i, 1))));
}

// Puxa do Shopify as vendas dos ultimos 12 meses completos + o mes corrente e
// regrava esses meses nas tabelas VendaMensal e ResumoMensal (meses mais
// antigos ficam como estao, pra ir formando historico).
export async function sincronizarVendas(): Promise<{ pedidos: number; meses: number }> {
  const meses = [...mesesCompletos(12), mesSP.format(new Date())];
  const filtro = `created_at:>=${meses[0]}-01`;
  const doPeriodo = new Set(meses);

  type Linha = { mes: string; chave: string; shopifyVariantId: string | null; shopifyProductId: string | null; titulo: string; quantidade: number; receita: Prisma.Decimal };
  const linhas = new Map<string, Linha>();
  const resumo = new Map(meses.map((m) => [m, { mes: m, pedidos: 0, receita: new Prisma.Decimal(0) }]));
  let pedidos = 0;

  const somar = (mes: string, item: ItemPedido) => {
    if (item.currentQuantity <= 0) return; // item todo devolvido ou removido
    const chave = item.variant?.id ?? `avulso:${item.title}`;
    const k = `${mes}|${chave}`;
    const receita = new Prisma.Decimal(item.discountedUnitPriceAfterAllDiscountsSet.shopMoney.amount).times(item.currentQuantity);
    const doMes = resumo.get(mes)!;
    doMes.receita = doMes.receita.plus(receita);
    const linha = linhas.get(k);
    if (linha) {
      linha.quantidade += item.currentQuantity;
      linha.receita = linha.receita.plus(receita);
    } else {
      linhas.set(k, {
        mes,
        chave,
        shopifyVariantId: item.variant?.id ?? null,
        shopifyProductId: item.product?.id ?? null,
        titulo: item.title,
        quantidade: item.currentQuantity,
        receita,
      });
    }
  };

  let cursor: string | null = null;
  let hasNextPage = true;
  let paginas = 0;
  // limite de seguranca: 400 paginas x 25 = 10 mil pedidos no periodo
  while (hasNextPage && paginas < 400) {
    paginas += 1;
    const data: PedidosResponse = await shopifyGraphQL<PedidosResponse>(PEDIDOS_QUERY, { cursor, filtro });
    for (const pedido of data.orders.nodes) {
      if (pedido.cancelledAt || pedido.test) continue;
      const mes = mesSP.format(new Date(pedido.createdAt));
      if (!doPeriodo.has(mes)) continue;
      pedidos += 1;
      resumo.get(mes)!.pedidos += 1;
      pedido.lineItems.nodes.forEach((item) => somar(mes, item));

      let itens = pedido.lineItems;
      while (itens.pageInfo.hasNextPage) {
        const resto: ItensResponse = await shopifyGraphQL<ItensResponse>(ITENS_QUERY, { id: pedido.id, cursor: itens.pageInfo.endCursor });
        if (!resto.order) break;
        itens = resto.order.lineItems;
        itens.nodes.forEach((item) => somar(mes, item));
      }
    }
    cursor = data.orders.pageInfo.endCursor;
    hasNextPage = data.orders.pageInfo.hasNextPage;
  }

  await prisma.$transaction(async (tx) => {
    await tx.vendaMensal.deleteMany({ where: { mes: { in: meses } } });
    await tx.vendaMensal.createMany({ data: [...linhas.values()] });
    await tx.resumoMensal.deleteMany({ where: { mes: { in: meses } } });
    await tx.resumoMensal.createMany({ data: [...resumo.values()] });
    await tx.configuracaoPrecificacao.upsert({
      where: { id: "unica" },
      create: { id: "unica", vendasAtualizadasEm: new Date() },
      update: { vendasAtualizadasEm: new Date() },
    });
  });

  return { pedidos, meses: meses.length };
}

export type VendasProdutos = {
  meses: string[];
  total: number; // receita dos 12 meses
  porVariante: Map<string, { quantidade: number; receita: number }>; // id interno da variante
  porProduto: Map<string, number>; // id interno do produto -> receita
  semProduto: number; // receita de itens avulsos / produtos que nao estao mais no catalogo
  atualizadoEm: Date | null;
};

// Vendas dos ultimos 12 meses completos, ligadas as variantes do catalogo.
export async function carregarVendas(): Promise<VendasProdutos> {
  const meses = mesesCompletos(12);
  const [grupos, config] = await Promise.all([
    prisma.vendaMensal.groupBy({
      by: ["chave", "shopifyVariantId"],
      where: { mes: { in: meses } },
      _sum: { quantidade: true, receita: true },
    }),
    prisma.configuracaoPrecificacao.findUnique({ where: { id: "unica" }, select: { vendasAtualizadasEm: true } }),
  ]);

  const ids = grupos.map((g) => g.shopifyVariantId).filter((id): id is string => id !== null);
  const variantes = await prisma.variante.findMany({
    where: { shopifyVariantId: { in: ids } },
    select: { id: true, produtoId: true, shopifyVariantId: true },
  });
  const porShopifyId = new Map(variantes.map((v) => [v.shopifyVariantId, v]));

  const porVariante = new Map<string, { quantidade: number; receita: number }>();
  const porProduto = new Map<string, number>();
  let total = 0;
  let semProduto = 0;
  for (const g of grupos) {
    const receita = g._sum.receita?.toNumber() ?? 0;
    const quantidade = g._sum.quantidade ?? 0;
    total += receita;
    const v = g.shopifyVariantId ? porShopifyId.get(g.shopifyVariantId) : undefined;
    if (!v) {
      semProduto += receita;
      continue;
    }
    porVariante.set(v.id, { quantidade, receita });
    porProduto.set(v.produtoId, (porProduto.get(v.produtoId) ?? 0) + receita);
  }

  return { meses, total, porVariante, porProduto, semProduto, atualizadoEm: config?.vendasAtualizadasEm ?? null };
}

// Medias dos pedidos nos ultimos 12 meses completos (null sem vendas): valor
// medio e quantos produtos vem num pedido. Brinde (item de R$ 0) nao conta
// como produto.
export async function mediasPedido(): Promise<{ ticket: number | null; itensPorPedido: number | null; pedidos: number }> {
  const meses = mesesCompletos(12);
  const [r, itens] = await Promise.all([
    prisma.resumoMensal.aggregate({ where: { mes: { in: meses } }, _sum: { pedidos: true, receita: true } }),
    prisma.vendaMensal.aggregate({ where: { mes: { in: meses }, receita: { gt: 0 } }, _sum: { quantidade: true } }),
  ]);
  const pedidos = r._sum.pedidos ?? 0;
  const receita = r._sum.receita?.toNumber() ?? 0;
  const unidades = itens._sum.quantidade ?? 0;
  return {
    ticket: pedidos > 0 ? receita / pedidos : null,
    itensPorPedido: pedidos > 0 && unidades > 0 ? unidades / pedidos : null,
    pedidos,
  };
}
