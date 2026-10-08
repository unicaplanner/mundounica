// Formulas de precificacao por MARGEM DE CONTRIBUICAO. Sem dependencia do
// banco: roda no servidor e no navegador (simulador).
//
// Margem de contribuicao (MC) = preco - custo do produto - embalagem de envio
// - despesas por venda (taxas, imposto). E o que cada venda deixa pra pagar os
// custos fixos e dar lucro. Cada tipo de produto tem a sua meta de MC: a
// revenda, com preco ditado pelo mercado, carrega menos; a producao propria
// compensa. Os custos fixos nao sao cobrados produto a produto: quem paga e a
// soma das MCs de todas as vendas (ver o painel de cobertura).
//
// preco sugerido = (custo + envio) / (1 - (despesas% + meta de MC%) / 100)

export type DespesaVenda = { nome: string; pct: number };
export type TipoComMeta = "producao_propria" | "revenda" | "kit";

export type ParametrosAnalise = {
  fixosPct: number | null; // custos fixos / faturamento medio (so pro painel geral)
  despesasPct: number;
  lucroPct: number; // lucro desejado do negocio como um todo
  envioPorProduto: number; // 0 enquanto nao da pra calcular
  despesas: DespesaVenda[]; // o detalhe de despesasPct, pra mostrar linha a linha
  margens: Record<TipoComMeta, number>; // meta de MC por tipo, em %
  totalFixos: number; // R$ por mes
};

export type StatusPreco = "prejuizo" | "abaixo_meta" | "ok";

export const ROTULO_TIPO: Record<TipoComMeta, string> = {
  producao_propria: "produção própria",
  revenda: "revenda",
  kit: "kit",
};

export function metaDoTipo(p: ParametrosAnalise, tipo: string | null | undefined): number {
  return tipo === "revenda" || tipo === "kit" || tipo === "producao_propria" ? p.margens[tipo] : p.margens.producao_propria;
}

// Multiplicador sobre (custo + envio) pra atingir a meta de MC do tipo.
export function markup(p: ParametrosAnalise, meta: number): number | null {
  const divisor = 1 - (p.despesasPct + meta) / 100;
  return divisor > 0 ? 1 / divisor : null;
}

export function precoSugerido(custo: number, p: ParametrosAnalise, meta: number): number | null {
  const m = markup(p, meta);
  return m === null ? null : (custo + p.envioPorProduto) * m;
}

export type AnalisePreco = {
  envio: number; // R$ por unidade (rateio da embalagem de envio)
  despesas: number; // R$ por unidade
  contribuicao: number; // preco - custo - envio - despesas
  contribuicaoPct: number;
  meta: number; // meta de MC do tipo, em %
  vendasParaFixos: number | null; // quantas vendas iguais pagam os fixos de um mes
  markupPraticado: number | null;
  status: StatusPreco;
};

export function analisarPreco(custo: number, preco: number, p: ParametrosAnalise, meta: number): AnalisePreco | null {
  if (preco <= 0) return null;
  const envio = p.envioPorProduto;
  const despesas = (preco * p.despesasPct) / 100;
  const contribuicao = preco - custo - envio - despesas;
  const contribuicaoPct = (contribuicao / preco) * 100;
  return {
    envio,
    despesas,
    contribuicao,
    contribuicaoPct,
    meta,
    vendasParaFixos: contribuicao > 0 && p.totalFixos > 0 ? Math.ceil(p.totalFixos / contribuicao) : null,
    markupPraticado: custo > 0 ? preco / custo : null,
    // meio ponto de folga pra arredondamento de preco nao virar "abaixo da meta"
    status: contribuicao < 0 ? "prejuizo" : contribuicaoPct < meta - 0.5 ? "abaixo_meta" : "ok",
  };
}

export const ROTULO_STATUS: Record<StatusPreco, string> = {
  prejuizo: "Prejuízo",
  abaixo_meta: "Abaixo da meta",
  ok: "Na meta",
};
