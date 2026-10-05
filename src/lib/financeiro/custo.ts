import { Prisma, type TipoProduto } from "@prisma/client";
import { prisma } from "@/lib/db";
import { impressoraPadrao } from "./impressao";

export interface Custo {
  valor: Prisma.Decimal;
  // true quando falta algo pra conta fechar (material sem compra registrada,
  // produto do kit sem custo, impressora sem volume de paginas): o valor
  // existe, mas esta subestimado.
  incompleto: boolean;
}

type Composicao = {
  custoCompra: Prisma.Decimal | null;
  ficha: { quantidade: Prisma.Decimal; custoMaterial: Prisma.Decimal }[];
  kit: { quantidade: Prisma.Decimal; componenteVarianteId: string }[];
  impressao: { folhas: Prisma.Decimal; custoFolha: Prisma.Decimal | null }[];
};

type VarianteInfo = { id: string; produtoId: string; title: string; preco: Prisma.Decimal | null; ativa: boolean; posicao: number; composicao: Composicao };
type ProdutoInfo = { id: string; title: string; tipo: TipoProduto | null; custoPorVariante: boolean; composicao: Composicao; variantes: VarianteInfo[] };

export type ResumoCusto =
  | { modo: "unico"; custo: Custo | null }
  | { modo: "variante"; min: Prisma.Decimal | null; max: Prisma.Decimal | null; comCusto: number; total: number; incompleto: boolean };

const vazia = (): Composicao => ({ custoCompra: null, ficha: [], kit: [], impressao: [] });

export function nomeVariante(tituloProduto: string, tituloVariante: string) {
  return tituloVariante === "Default Title" ? tituloProduto : `${tituloProduto} — ${tituloVariante}`;
}

// Calcula o custo de qualquer produto ou variante, inclusive kits (que somam
// o custo das variantes que estao dentro deles). Carrega tudo numa leva so;
// a loja tem algumas centenas de produtos, entao cabe na memoria tranquilo.
export class Custos {
  private cache = new Map<string, Custo | null>();

  constructor(
    readonly produtos: Map<string, ProdutoInfo>,
    readonly variantes: Map<string, VarianteInfo>
  ) {}

  private daComposicao(tipo: TipoProduto | null, c: Composicao, pilha: Set<string>): Custo | null {
    if (tipo === "revenda") {
      return c.custoCompra ? { valor: c.custoCompra, incompleto: false } : null;
    }
    if (tipo !== "producao_propria" && tipo !== "kit") return null;
    if (c.ficha.length === 0 && c.impressao.length === 0 && (tipo === "producao_propria" || c.kit.length === 0)) return null;

    let valor = new Prisma.Decimal(0);
    let incompleto = false;
    for (const item of c.ficha) {
      valor = valor.plus(item.quantidade.times(item.custoMaterial));
      if (item.custoMaterial.isZero()) incompleto = true;
    }
    for (const item of c.impressao) {
      if (!item.custoFolha) {
        incompleto = true;
        continue;
      }
      valor = valor.plus(item.folhas.times(item.custoFolha));
    }
    if (tipo === "kit") {
      for (const item of c.kit) {
        // pilha evita laco infinito se algum dia um kit acabar dentro dele mesmo
        const custo = pilha.has(item.componenteVarianteId) ? null : this.daVariante(item.componenteVarianteId, pilha);
        if (!custo) {
          incompleto = true;
          continue;
        }
        valor = valor.plus(item.quantidade.times(custo.valor));
        if (custo.incompleto) incompleto = true;
      }
    }
    return { valor, incompleto };
  }

  daVariante(varianteId: string, pilha = new Set<string>()): Custo | null {
    if (this.cache.has(varianteId)) return this.cache.get(varianteId)!;
    const v = this.variantes.get(varianteId);
    const p = v && this.produtos.get(v.produtoId);
    if (!v || !p) return null;

    const composicao = p.custoPorVariante ? v.composicao : p.composicao;
    const custo = this.daComposicao(p.tipo, composicao, new Set([...pilha, varianteId]));
    this.cache.set(varianteId, custo);
    return custo;
  }

  doProduto(produtoId: string): Custo | null {
    const p = this.produtos.get(produtoId);
    return p ? this.daComposicao(p.tipo, p.composicao, new Set()) : null;
  }

  resumo(produtoId: string): ResumoCusto | null {
    const p = this.produtos.get(produtoId);
    if (!p?.tipo) return null;
    if (!p.custoPorVariante) return { modo: "unico", custo: this.doProduto(produtoId) };

    const ativas = p.variantes.filter((v) => v.ativa);
    const custos = ativas.map((v) => this.daVariante(v.id)).filter((c): c is Custo => c !== null);
    const valores = custos.map((c) => c.valor);
    return {
      modo: "variante",
      min: valores.length ? Prisma.Decimal.min(...valores) : null,
      max: valores.length ? Prisma.Decimal.max(...valores) : null,
      comCusto: custos.length,
      total: ativas.length,
      incompleto: custos.some((c) => c.incompleto) || custos.length < ativas.length,
    };
  }
}

export async function carregarCustos(): Promise<Custos> {
  const [produtos, ficha, kit, impressao, impressoras] = await Promise.all([
    prisma.produto.findMany({
      select: {
        id: true,
        title: true,
        tipo: true,
        custoPorVariante: true,
        custoCompra: true,
        variantes: {
          select: { id: true, title: true, preco: true, ativa: true, posicao: true, custoCompra: true },
          orderBy: { posicao: "asc" },
        },
      },
    }),
    prisma.fichaTecnicaItem.findMany({
      select: { produtoId: true, varianteId: true, quantidade: true, material: { select: { custoAtual: true } } },
    }),
    prisma.kitItem.findMany({
      select: { kitProdutoId: true, kitVarianteId: true, componenteVarianteId: true, quantidade: true },
    }),
    prisma.impressaoItem.findMany({
      select: { produtoId: true, varianteId: true, folhas: true },
    }),
    prisma.impressora.findMany(),
  ]);
  // toda folha usa o custo da impressora mais cara (ver impressoraPadrao)
  const custoFolha = impressoraPadrao(impressoras)?.custoFolha ?? null;

  const mapaProdutos = new Map<string, ProdutoInfo>();
  const mapaVariantes = new Map<string, VarianteInfo>();

  for (const p of produtos) {
    const info: ProdutoInfo = {
      id: p.id,
      title: p.title,
      tipo: p.tipo,
      custoPorVariante: p.custoPorVariante,
      composicao: { ...vazia(), custoCompra: p.custoCompra },
      variantes: [],
    };
    for (const v of p.variantes) {
      const vi: VarianteInfo = {
        id: v.id,
        produtoId: p.id,
        title: v.title,
        preco: v.preco,
        ativa: v.ativa,
        posicao: v.posicao,
        composicao: { ...vazia(), custoCompra: v.custoCompra },
      };
      info.variantes.push(vi);
      mapaVariantes.set(v.id, vi);
    }
    mapaProdutos.set(p.id, info);
  }

  for (const f of ficha) {
    const dono = f.varianteId ? mapaVariantes.get(f.varianteId) : mapaProdutos.get(f.produtoId);
    dono?.composicao.ficha.push({ quantidade: f.quantidade, custoMaterial: f.material.custoAtual });
  }
  for (const k of kit) {
    const dono = k.kitVarianteId ? mapaVariantes.get(k.kitVarianteId) : mapaProdutos.get(k.kitProdutoId);
    dono?.composicao.kit.push({ quantidade: k.quantidade, componenteVarianteId: k.componenteVarianteId });
  }
  for (const i of impressao) {
    const dono = i.varianteId ? mapaVariantes.get(i.varianteId) : mapaProdutos.get(i.produtoId);
    dono?.composicao.impressao.push({ folhas: i.folhas, custoFolha });
  }

  return new Custos(mapaProdutos, mapaVariantes);
}
