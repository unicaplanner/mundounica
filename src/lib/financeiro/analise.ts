// Formulas de precificacao (markup divisor, como no metodo do Sebrae). Sem
// dependencia do banco: roda no servidor e no navegador (simulador).
//
// Em % sobre o PRECO DE VENDA:
//   fixosPct    = custos fixos do mes / faturamento medio do mes
//   despesasPct = o que sai de cada venda (imposto, taxa do Shopify, gateway...)
//   lucroPct    = lucro que sobra depois de pagar tudo
// Em R$ por produto vendido:
//   envioPorProduto = embalagem de envio media por pedido / produtos por pedido
// preco sugerido = (custo + envio) / (1 - (fixos + despesas + lucro) / 100)

export type DespesaVenda = { nome: string; pct: number };

export type ParametrosAnalise = {
  fixosPct: number | null; // null enquanto o faturamento medio nao foi informado
  despesasPct: number;
  lucroPct: number;
  envioPorProduto: number; // 0 enquanto nao da pra calcular
  despesas: DespesaVenda[]; // o detalhe de despesasPct, pra mostrar linha a linha
};

export type StatusPreco = "prejuizo" | "abaixo_meta" | "ok";

export function markup(p: ParametrosAnalise): number | null {
  const divisor = 1 - ((p.fixosPct ?? 0) + p.despesasPct + p.lucroPct) / 100;
  return divisor > 0 ? 1 / divisor : null;
}

export function precoSugerido(custo: number, p: ParametrosAnalise): number | null {
  const m = markup(p);
  return m === null ? null : (custo + p.envioPorProduto) * m;
}

export type AnalisePreco = {
  envio: number; // R$ por unidade (rateio da embalagem de envio)
  despesas: number; // R$ por unidade
  fixos: number; // R$ por unidade (rateio)
  contribuicao: number; // preco - custo - envio - despesas
  contribuicaoPct: number;
  lucro: number; // contribuicao - fixos
  lucroPct: number;
  markupPraticado: number | null;
  status: StatusPreco;
};

export function analisarPreco(custo: number, preco: number, p: ParametrosAnalise): AnalisePreco | null {
  if (preco <= 0) return null;
  const envio = p.envioPorProduto;
  const despesas = (preco * p.despesasPct) / 100;
  const fixos = (preco * (p.fixosPct ?? 0)) / 100;
  const contribuicao = preco - custo - envio - despesas;
  const lucro = contribuicao - fixos;
  const lucroPct = (lucro / preco) * 100;
  return {
    envio,
    despesas,
    fixos,
    contribuicao,
    contribuicaoPct: (contribuicao / preco) * 100,
    lucro,
    lucroPct,
    markupPraticado: custo > 0 ? preco / custo : null,
    // meio ponto de folga pra arredondamento de preco nao virar "abaixo da meta"
    status: lucro < 0 ? "prejuizo" : lucroPct < p.lucroPct - 0.5 ? "abaixo_meta" : "ok",
  };
}

export const ROTULO_STATUS: Record<StatusPreco, string> = {
  prejuizo: "Prejuízo",
  abaixo_meta: "Abaixo da meta",
  ok: "Na meta",
};
