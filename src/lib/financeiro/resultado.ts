import { prisma } from "@/lib/db";
import { Custos, carregarCustos } from "./custo";
import { carregarEnvio } from "./envio";

// Resultado de cada mes com as vendas reais do Shopify (ResumoMensal +
// VendaMensal) e os custos de hoje do sistema.
//
// vendas (ja com desconto, sem frete)
// - produtos (materiais, impressao, compras)
// - mao de obra (tempo de producao x valor da hora)
// - embalagem de envio (pedidos x custo medio por pedido)
// - taxas de cartao/gateway (sobre vendas + frete; o cupom ja saiu das vendas)
// = margem de contribuicao
// - custos fixos sem o pro-labore
// = sobra pro pro-labore
// - pro-labore desejado
// = lucro do mes

export type ResultadoMes = {
  mes: string; // "2026-09"
  parcial: boolean; // mes corrente
  pedidos: number;
  vendas: number;
  frete: number;
  produtos: number; // custo dos produtos vendidos sem mao de obra (inclui estimativa)
  maoDeObra: number;
  estimado: number; // parte de produtos+mao de obra estimada (vendas sem custo cadastrado)
  coberturaPct: number; // % das vendas com custo cadastrado
  embalagem: number;
  taxas: number;
  margem: number;
  fixosSemProLabore: number;
  sobraProLabore: number;
  proLabore: number;
  lucro: number;
};

export type Resultados = {
  meses: ResultadoMes[]; // do mais antigo pro mais novo
  taxasPct: number;
  despesasForaDaConta: string[]; // cupom/desconto: ja descontado das vendas
  envioPorPedido: number | null;
  semCusto: boolean; // nenhuma venda com custo: tudo estimado nao da
};

const ehProLabore = (nome: string) => /pr[oó][\s-]?labore/i.test(nome);
const ehDesconto = (nome: string) => /cupo|cupom|desconto/i.test(nome);

export async function carregarResultados(): Promise<Resultados> {
  const [resumos, vendas, custos, envio, despesas, fixos] = await Promise.all([
    prisma.resumoMensal.findMany({ orderBy: { mes: "asc" } }),
    prisma.vendaMensal.findMany({ select: { mes: true, shopifyVariantId: true, quantidade: true, receita: true } }),
    carregarCustos(),
    carregarEnvio(),
    prisma.despesaVariavel.findMany(),
    prisma.custoFixo.findMany(),
  ]);

  // mesmos custos sem a mao de obra, pra separar uma coisa da outra
  const semMaoDeObra = new Custos(custos.produtos, custos.variantes, null);
  const ligacoes = await prisma.variante.findMany({ select: { id: true, shopifyVariantId: true } });
  const varPorShopify = new Map(ligacoes.map((l) => [l.shopifyVariantId, l.id]));

  const taxas = despesas.filter((d) => !ehDesconto(d.nome));
  const taxasPct = taxas.reduce((acc, d) => acc + d.percentual.toNumber(), 0);
  const proLabore = fixos.filter((f) => ehProLabore(f.nome)).reduce((acc, f) => acc + f.valorMensal.toNumber(), 0);
  const fixosSemProLabore = fixos.filter((f) => !ehProLabore(f.nome)).reduce((acc, f) => acc + f.valorMensal.toNumber(), 0);
  const envioPorPedido = envio.custoMedio;

  // custo por mes das vendas com custo cadastrado
  type Acum = { comCusto: number; produtos: number; maoDeObra: number };
  const porMes = new Map<string, Acum>();
  for (const v of vendas) {
    const receita = v.receita.toNumber();
    if (receita <= 0) continue;
    const varianteId = v.shopifyVariantId ? varPorShopify.get(v.shopifyVariantId) : undefined;
    const info = varianteId ? custos.variantes.get(varianteId) : undefined;
    const tipo = info ? custos.produtos.get(info.produtoId)?.tipo : null;
    if (!varianteId || !tipo || tipo === "ignorar") continue;
    const total = custos.daVariante(varianteId);
    if (!total) continue;
    const material = semMaoDeObra.daVariante(varianteId)?.valor.toNumber() ?? total.valor.toNumber();
    const acum = porMes.get(v.mes) ?? { comCusto: 0, produtos: 0, maoDeObra: 0 };
    acum.comCusto += receita;
    acum.produtos += v.quantidade * material;
    acum.maoDeObra += v.quantidade * (total.valor.toNumber() - material);
    porMes.set(v.mes, acum);
  }

  // proporcao media de custo sobre vendas, pra estimar o que nao tem custo
  let somaComCusto = 0;
  let somaProdutos = 0;
  let somaMao = 0;
  for (const a of porMes.values()) {
    somaComCusto += a.comCusto;
    somaProdutos += a.produtos;
    somaMao += a.maoDeObra;
  }
  const razaoProdutos = somaComCusto > 0 ? somaProdutos / somaComCusto : 0;
  const razaoMao = somaComCusto > 0 ? somaMao / somaComCusto : 0;

  const mesAtual = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).format(new Date());

  const meses = resumos.map((r): ResultadoMes => {
    const vendasMes = r.receita.toNumber();
    const frete = r.frete.toNumber();
    const acum = porMes.get(r.mes) ?? { comCusto: 0, produtos: 0, maoDeObra: 0 };
    const semCustoMes = Math.max(vendasMes - acum.comCusto, 0);
    const estProdutos = semCustoMes * razaoProdutos;
    const estMao = semCustoMes * razaoMao;
    const produtos = acum.produtos + estProdutos;
    const maoDeObra = acum.maoDeObra + estMao;
    const embalagem = envioPorPedido !== null ? r.pedidos * envioPorPedido : 0;
    const taxasMes = ((vendasMes + frete) * taxasPct) / 100;
    const margem = vendasMes - produtos - maoDeObra - embalagem - taxasMes;
    const sobraProLabore = margem - fixosSemProLabore;
    return {
      mes: r.mes,
      parcial: r.mes === mesAtual,
      pedidos: r.pedidos,
      vendas: vendasMes,
      frete,
      produtos,
      maoDeObra,
      estimado: estProdutos + estMao,
      coberturaPct: vendasMes > 0 ? (acum.comCusto / vendasMes) * 100 : 0,
      embalagem,
      taxas: taxasMes,
      margem,
      fixosSemProLabore,
      sobraProLabore,
      proLabore,
      lucro: sobraProLabore - proLabore,
    };
  });

  return {
    meses,
    taxasPct,
    despesasForaDaConta: despesas.filter((d) => ehDesconto(d.nome)).map((d) => d.nome),
    envioPorPedido,
    semCusto: somaComCusto === 0,
  };
}
