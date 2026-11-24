import type { MktConteudo } from "@prisma/client";
import { prisma } from "@/lib/db";
import { shopifyGraphQL } from "@/lib/financeiro/shopify";
import { hojeISO, somarDias } from "./datas";

// Avisos do calendario de Marketing, com o Shopify ao vivo:
// - estoque: o produto que o post divulga esta acabando ou esgotado
// - fila: os pedidos em aberto (a mesma fila da Central de Producao). Prazo
//   combinado: 15 dias uteis desde o pedido (regra da Central). Fila
//   atrasada + post de promocao = vender o que nao da pra entregar no prazo.
// As consultas ao Shopify ficam guardadas por 10 minutos.

export const PRAZO_DIAS_UTEIS = 15;
const ESTOQUE_BAIXO_TOTAL = 5;
const ESTOQUE_BAIXO_VARIANTE = 2;
const DIAS_A_FRENTE = 30;
const CACHE_MS = 10 * 60 * 1000;
const TRAVADO_DIAS_UTEIS = 40;

export type NivelFila = "ok" | "atencao" | "alerta";
export type Fila = {
  abertos: number;
  atrasados: number;
  maisAntigoDiasUteis: number;
  travados: number; // mais de 40 dias uteis: provavelmente parado, conferir na Central
  prazoRealDiasUteis: number; // o que da pra prometer hoje pra um pedido novo
  nivel: NivelFila;
};

export type EstoqueProduto = {
  titulo: string;
  url: string | null;
  total: number;
  esgotado: boolean;
  variantesBaixas: { titulo: string; qtd: number }[];
};

export type AvisoConteudo = {
  conteudoId: string;
  data: Date;
  titulo: string;
  estoque: EstoqueProduto[]; // so os que estao baixos
  promoComFilaAtrasada: boolean;
  temPrazoParaPreencher: boolean; // "[PRAZO REAL]" no texto
};

// ---------- cache simples por instancia do servidor ----------
const cache = new Map<string, { em: number; valor: unknown }>();
async function guardado<T>(chave: string, carregar: () => Promise<T>): Promise<T> {
  const c = cache.get(chave);
  if (c && Date.now() - c.em < CACHE_MS) return c.valor as T;
  const valor = await carregar();
  cache.set(chave, { em: Date.now(), valor });
  return valor;
}

// ---------- fila de pedidos ----------
function diasUteisEntre(de: Date, ate: Date) {
  let n = 0;
  const d = new Date(Date.UTC(de.getUTCFullYear(), de.getUTCMonth(), de.getUTCDate()));
  const fim = Date.UTC(ate.getUTCFullYear(), ate.getUTCMonth(), ate.getUTCDate());
  while (d.getTime() < fim) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dia = d.getUTCDay();
    if (dia !== 0 && dia !== 6) n++;
  }
  return n;
}

type PedidosResp = { orders: { nodes: { createdAt: string; requiresShipping: boolean }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } };

export function carregarFila(): Promise<Fila> {
  return guardado("fila", async () => {
    const datas: Date[] = [];
    let cursor: string | null = null;
    for (let i = 0; i < 4; i++) {
      const r: PedidosResp = await shopifyGraphQL<PedidosResp>(
        `query Fila($cursor: String) {
          orders(first: 250, after: $cursor, query: "status:open fulfillment_status:unfulfilled") {
            nodes { createdAt requiresShipping }
            pageInfo { hasNextPage endCursor }
          }
        }`,
        { cursor }
      );
      // cartao de presente e outros digitais nao passam pela producao
      datas.push(...r.orders.nodes.filter((o) => o.requiresShipping).map((o) => new Date(o.createdAt)));
      if (!r.orders.pageInfo.hasNextPage) break;
      cursor = r.orders.pageInfo.endCursor;
    }
    const agora = new Date();
    const idades = datas.map((d) => diasUteisEntre(d, agora)).sort((a, b) => a - b);
    const atrasos = idades.filter((i) => i > PRAZO_DIAS_UTEIS);
    // Prazo real: a idade mediana dos atrasados (sem os travados, que puxam
    // a conta pra cima), arredondada pra cima em 5. Sem atraso, os 15 dias.
    const travados = idades.filter((i) => i > TRAVADO_DIAS_UTEIS).length;
    const tipicos = atrasos.filter((i) => i <= TRAVADO_DIAS_UTEIS);
    const mediana = tipicos.length ? tipicos[Math.floor((tipicos.length - 1) / 2)] : PRAZO_DIAS_UTEIS;
    const prazoReal = Math.ceil(Math.max(PRAZO_DIAS_UTEIS, mediana) / 5) * 5;
    return {
      abertos: datas.length,
      atrasados: atrasos.length,
      maisAntigoDiasUteis: idades.at(-1) ?? 0,
      travados,
      prazoRealDiasUteis: prazoReal,
      nivel: tipicos.length > 5 ? "alerta" : tipicos.length > 0 ? "atencao" : "ok",
    };
  });
}

// ---------- estoque dos produtos citados no post ----------
const normalizar = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^\d{4}\s*\|\s*/, "") // "2026 | Semanal Vertical"
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

type ProdutoBase = { shopifyProductId: string; title: string; url: string | null; status: string | null };

// Os produtos que o campo "produtos" do post cita: por link da loja
// (/products/handle) ou pelo nome (separados por ·, virgula, + ou " e ").
export function produtosCitados(texto: string | null, produtos: ProdutoBase[]): ProdutoBase[] {
  if (!texto) return [];
  const achados = new Map<string, ProdutoBase>();
  const handle = (url: string | null) => url?.match(/\/products\/([^/?#]+)/)?.[1] ?? null;
  for (const m of texto.matchAll(/\/products\/([^/?#\s)]+)/g)) {
    const p = produtos.find((x) => handle(x.url) === m[1]);
    if (p) achados.set(p.shopifyProductId, p);
  }
  const ativos = produtos.filter((p) => p.status === "ACTIVE");
  const nomes = texto
    .replace(/\(?https?:\/\/\S+\)?/g, " ")
    .split(/·|,|\+|;|\n| e /)
    .map(normalizar)
    .filter((n) => n.length >= 6);
  for (const nome of nomes) {
    // o nome mais longo que cabe no texto ganha ("semanal vertical" antes de "semanal")
    const candidatos = ativos
      .map((p) => ({ p, n: normalizar(p.title) }))
      .filter(({ n }) => n.length >= 6 && (nome.includes(n) || n.includes(nome)))
      .sort((a, b) => b.n.length - a.n.length);
    if (candidatos[0]) achados.set(candidatos[0].p.shopifyProductId, candidatos[0].p);
  }
  return [...achados.values()];
}

type EstoqueResp = {
  nodes: ({
    id: string;
    title: string;
    onlineStoreUrl: string | null;
    tracksInventory: boolean;
    totalInventory: number;
    variants: { nodes: { title: string; inventoryQuantity: number | null }[] };
  } | null)[];
};

async function estoquesShopify(ids: string[]): Promise<Map<string, EstoqueProduto>> {
  const chave = `estoque:${[...ids].sort().join(",")}`;
  return guardado(chave, async () => {
    const mapa = new Map<string, EstoqueProduto>();
    for (let i = 0; i < ids.length; i += 50) {
      const r = await shopifyGraphQL<EstoqueResp>(
        `query Estoque($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on Product {
              id title onlineStoreUrl tracksInventory totalInventory
              variants(first: 50) { nodes { title inventoryQuantity } }
            }
          }
        }`,
        { ids: ids.slice(i, i + 50) }
      );
      for (const p of r.nodes) {
        if (!p || !p.tracksInventory) continue;
        const variantes = p.variants.nodes.filter((v) => v.inventoryQuantity !== null);
        mapa.set(p.id, {
          titulo: p.title,
          url: p.onlineStoreUrl,
          total: p.totalInventory,
          esgotado: p.totalInventory <= 0,
          variantesBaixas: variantes
            .filter((v) => (v.inventoryQuantity ?? 0) <= ESTOQUE_BAIXO_VARIANTE)
            .map((v) => ({ titulo: v.title === "Default Title" ? "única" : v.title, qtd: v.inventoryQuantity ?? 0 })),
        });
      }
    }
    return mapa;
  });
}

const PROMO = /black|promo|oferta|desconto|cupom|natal|frete gr[aá]tis|lan[cç]amento|pr[eé]-?venda|queima|liquida/i;

export function ehPromocao(c: Pick<MktConteudo, "titulo" | "campanha">) {
  return PROMO.test(c.titulo) || PROMO.test(c.campanha ?? "");
}

const temPrazo = (c: Pick<MktConteudo, "legenda" | "roteiro" | "cta">) =>
  /\[PRAZO[^\]]*\]/i.test(`${c.legenda ?? ""} ${c.cta ?? ""} ${JSON.stringify(c.roteiro ?? "")}`);

type ConteudoParaAviso = Pick<MktConteudo, "id" | "data" | "titulo" | "produtos" | "campanha" | "legenda" | "roteiro" | "cta" | "status">;

// Avisos de uma lista de posts. Falha do Shopify nao derruba a pagina: devolve erro.
export async function avisosDosConteudos(
  conteudos: ConteudoParaAviso[]
): Promise<{ fila: Fila | null; avisos: AvisoConteudo[]; erro: string | null }> {
  const pendentes = conteudos.filter((c) => c.status !== "publicado");
  try {
    const produtos = await prisma.produto.findMany({ select: { shopifyProductId: true, title: true, url: true, status: true } });
    const citados = new Map(pendentes.map((c) => [c.id, produtosCitados(c.produtos, produtos)]));
    const ids = [...new Set([...citados.values()].flat().map((p) => p.shopifyProductId))];
    const [fila, estoques] = await Promise.all([carregarFila(), ids.length ? estoquesShopify(ids) : Promise.resolve(new Map())]);

    const avisos = pendentes
      .map((c): AvisoConteudo => {
        const estoque = (citados.get(c.id) ?? [])
          .map((p) => estoques.get(p.shopifyProductId))
          .filter((e): e is EstoqueProduto => !!e && (e.esgotado || e.total <= ESTOQUE_BAIXO_TOTAL || e.variantesBaixas.length > 0));
        return {
          conteudoId: c.id,
          data: c.data,
          titulo: c.titulo,
          estoque,
          promoComFilaAtrasada: fila.nivel !== "ok" && ehPromocao(c),
          temPrazoParaPreencher: temPrazo(c),
        };
      })
      .filter((a) => a.estoque.length > 0 || a.promoComFilaAtrasada || a.temPrazoParaPreencher);
    return { fila, avisos, erro: null };
  } catch (e) {
    console.error("avisos do marketing", e);
    return { fila: null, avisos: [], erro: "Não deu pra consultar o Shopify agora (estoque e fila). Recarregue daqui a pouco." };
  }
}

// Os posts dos proximos 30 dias que ainda nao foram publicados.
export async function avisosProximos() {
  const hoje = hojeISO();
  const conteudos = await prisma.mktConteudo.findMany({
    where: {
      arquivadoEm: null,
      status: { not: "publicado" },
      data: { gte: new Date(`${hoje}T00:00:00Z`), lte: new Date(`${somarDias(hoje, DIAS_A_FRENTE)}T00:00:00Z`) },
    },
    select: { id: true, data: true, titulo: true, produtos: true, campanha: true, legenda: true, roteiro: true, cta: true, status: true },
    orderBy: { data: "asc" },
  });
  return avisosDosConteudos(conteudos);
}
