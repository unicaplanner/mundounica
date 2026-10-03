const API_VERSION = "2026-07";

export interface ShopifyProduto {
  id: string;
  title: string;
  status: string;
  onlineStoreUrl: string | null;
}

interface ProdutosResponse {
  products: {
    edges: { cursor: string; node: ShopifyProduto }[];
    pageInfo: { hasNextPage: boolean };
  };
}

const PRODUTOS_QUERY = /* GraphQL */ `
  query Produtos($cursor: String) {
    products(first: 100, after: $cursor) {
      edges {
        cursor
        node {
          id
          title
          status
          onlineStoreUrl
        }
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;

export async function shopifyGraphQL<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  if (!domain || !token) {
    throw new Error("SHOPIFY_STORE_DOMAIN e SHOPIFY_ADMIN_ACCESS_TOKEN precisam estar configurados.");
  }

  const res = await fetch(`https://${domain}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Shopify respondeu ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  if (json.errors) {
    throw new Error(`Erro do Shopify: ${JSON.stringify(json.errors)}`);
  }
  return json.data as T;
}

export interface ShopifyVariante {
  id: string;
  title: string;
  sku: string | null;
  price: string;
  position: number;
  product: { id: string };
}

interface VariantesResponse {
  productVariants: {
    edges: { cursor: string; node: ShopifyVariante }[];
    pageInfo: { hasNextPage: boolean };
  };
}

// Variantes vem numa consulta propria (e nao aninhadas em products) porque
// conexoes aninhadas multiplicam o custo da consulta no Shopify.
const VARIANTES_QUERY = /* GraphQL */ `
  query Variantes($cursor: String) {
    productVariants(first: 250, after: $cursor) {
      edges {
        cursor
        node {
          id
          title
          sku
          price
          position
          product {
            id
          }
        }
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;

export async function buscarVariantesShopify(): Promise<ShopifyVariante[]> {
  const variantes: ShopifyVariante[] = [];
  let cursor: string | undefined;
  let hasNextPage = true;
  let paginas = 0;

  while (hasNextPage && paginas < 40) {
    paginas += 1;
    const data = await shopifyGraphQL<VariantesResponse>(VARIANTES_QUERY, { cursor });
    for (const edge of data.productVariants.edges) {
      variantes.push(edge.node);
      cursor = edge.cursor;
    }
    hasNextPage = data.productVariants.pageInfo.hasNextPage;
  }

  return variantes;
}

// Pagina ate acabar, com limite de seguranca de 30 paginas (~3000 produtos)
// pra nunca entrar em loop infinito por engano.
export async function buscarProdutosShopify(): Promise<ShopifyProduto[]> {
  const produtos: ShopifyProduto[] = [];
  let cursor: string | undefined;
  let hasNextPage = true;
  let paginas = 0;

  while (hasNextPage && paginas < 30) {
    paginas += 1;
    const data = await shopifyGraphQL<ProdutosResponse>(PRODUTOS_QUERY, { cursor });
    for (const edge of data.products.edges) {
      produtos.push(edge.node);
      cursor = edge.cursor;
    }
    hasNextPage = data.products.pageInfo.hasNextPage;
  }

  return produtos;
}
