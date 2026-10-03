import { shopifyGraphQL } from "./shopify";

type Pedido = {
  createdAt: string;
  cancelledAt: string | null;
  test: boolean;
  currentSubtotalPriceSet: { shopMoney: { amount: string } };
};

interface PedidosResponse {
  orders: { edges: { cursor: string; node: Pedido }[]; pageInfo: { hasNextPage: boolean } };
}

const PEDIDOS_QUERY = /* GraphQL */ `
  query Pedidos($cursor: String, $filtro: String!) {
    orders(first: 250, after: $cursor, query: $filtro, sortKey: CREATED_AT) {
      edges {
        cursor
        node {
          createdAt
          cancelledAt
          test
          currentSubtotalPriceSet {
            shopMoney {
              amount
            }
          }
        }
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;

const mesSP = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" });

export type FaturamentoMes = { mes: string; total: number; pedidos: number }; // mes = "2026-09"

// Faturamento de produtos por mes (subtotal dos pedidos depois de descontos
// e devolucoes, sem frete), dos ultimos `meses` meses COMPLETOS -- o mes
// corrente fica de fora porque ainda esta pela metade. Pedidos cancelados e
// de teste nao contam.
export async function faturamentoPorMes(meses = 12): Promise<FaturamentoMes[]> {
  const [anoAtual, mesAtual] = mesSP.format(new Date()).split("-").map(Number);
  const inicio = new Date(Date.UTC(anoAtual, mesAtual - 1 - meses, 1));
  const chaves: string[] = [];
  for (let i = 0; i < meses; i++) {
    const d = new Date(Date.UTC(anoAtual, mesAtual - 1 - meses + i, 1));
    chaves.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  const porMes = new Map(chaves.map((k) => [k, { mes: k, total: 0, pedidos: 0 }]));

  const filtro = `created_at:>=${inicio.toISOString().slice(0, 10)}`;
  let cursor: string | undefined;
  let hasNextPage = true;
  let paginas = 0;
  while (hasNextPage && paginas < 60) {
    paginas += 1;
    const data = await shopifyGraphQL<PedidosResponse>(PEDIDOS_QUERY, { cursor, filtro });
    for (const { node, cursor: c } of data.orders.edges) {
      cursor = c;
      if (node.cancelledAt || node.test) continue;
      const linha = porMes.get(mesSP.format(new Date(node.createdAt)));
      if (!linha) continue; // mes corrente
      linha.total += Number(node.currentSubtotalPriceSet.shopMoney.amount);
      linha.pedidos += 1;
    }
    hasNextPage = data.orders.pageInfo.hasNextPage;
  }

  return chaves.map((k) => porMes.get(k)!);
}
