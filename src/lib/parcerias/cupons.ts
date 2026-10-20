import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { shopifyGraphQL } from "@/lib/financeiro/shopify";

type Pedido = {
  cancelledAt: string | null;
  test: boolean;
  currentSubtotalPriceSet: { shopMoney: { amount: string } };
};

interface PedidosResponse {
  orders: { nodes: Pedido[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
}

// Subtotal depois dos descontos, sem frete: e o que o cupom trouxe de venda.
const PEDIDOS_CUPOM = /* GraphQL */ `
  query PedidosCupom($cursor: String, $filtro: String!) {
    orders(first: 100, after: $cursor, query: $filtro) {
      nodes {
        cancelledAt
        test
        currentSubtotalPriceSet {
          shopMoney {
            amount
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export function normalizarCupom(texto: unknown): string | null {
  const c = String(texto ?? "")
    .trim()
    .toUpperCase();
  return /^[A-Z0-9_-]{2,40}$/.test(c) ? c : null;
}

export async function vendasDoCupom(codigo: string) {
  let cursor: string | null = null;
  let pedidos = 0;
  let total = new Prisma.Decimal(0);
  for (let pagina = 0; pagina < 20; pagina++) {
    const data: PedidosResponse = await shopifyGraphQL<PedidosResponse>(PEDIDOS_CUPOM, {
      cursor,
      filtro: `discount_code:${codigo} AND -status:cancelled`,
    });
    for (const p of data.orders.nodes) {
      if (p.cancelledAt || p.test) continue;
      pedidos += 1;
      total = total.plus(p.currentSubtotalPriceSet.shopMoney.amount);
    }
    if (!data.orders.pageInfo.hasNextPage) break;
    cursor = data.orders.pageInfo.endCursor;
  }
  return { pedidos, total };
}

// Atualiza as vendas de todas as criadoras com cupom (ou so de uma).
export async function atualizarCupons(criadoraId?: string) {
  const criadoras = await prisma.criadora.findMany({
    where: { cupom: { not: null }, ...(criadoraId ? { id: criadoraId } : {}) },
    select: { id: true, cupom: true },
  });
  let atualizadas = 0;
  for (const c of criadoras) {
    const { pedidos, total } = await vendasDoCupom(c.cupom!);
    await prisma.criadora.update({
      where: { id: c.id },
      data: { cupomPedidos: pedidos, cupomVendas: total, cupomAtualizadoEm: new Date() },
    });
    atualizadas += 1;
  }
  return atualizadas;
}
