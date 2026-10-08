import { prisma } from "@/lib/db";

// Teto de faturamento do MEI por ano-calendario (jan-dez). Se a lei mudar, e
// so trocar aqui.
export const TETO_MEI = 81000;
// A partir deste % do teto, hora de incluir o imposto do Simples nas despesas
// por venda (regra da Lari): o desenquadramento pode chegar no ano seguinte.
export const ALERTA_SIMPLES = 80;

export type MesMei = { mes: string; receita: number; projetado: boolean };
export type Mei = {
  ano: number;
  vendido: number; // vendas de produtos no ano ate agora (com desconto, sem frete)
  projecao: number; // ate dezembro, repetindo os mesmos meses do ano anterior
  pctVendido: number;
  pctProjecao: number;
  meses: MesMei[];
  semHistorico: boolean; // faltam meses do ano anterior pra projetar
  // frete cobrado dos clientes, a parte (se conta ou nao pro MEI, o contador confirma)
  frete: number;
  freteProjecao: number;
  pctComFrete: number;
  pctProjecaoComFrete: number;
};

const mesSP = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" });

// Medidor do MEI com os pedidos por mes (ResumoMensal, puxado junto com as
// vendas). Projecao: cada mes que falta vale o mesmo mes do ano passado; o
// mes corrente vale o maior entre o que ja vendeu e o mesmo mes do ano passado.
export async function carregarMei(): Promise<Mei> {
  const [ano, mesAtual] = mesSP.format(new Date()).split("-").map(Number);
  const linhas = await prisma.resumoMensal.findMany({
    where: { mes: { gte: `${ano - 1}-01`, lte: `${ano}-12` } },
    select: { mes: true, receita: true, frete: true },
  });
  const porMes = new Map(linhas.map((l) => [l.mes, l.receita.toNumber()]));
  const fretePorMes = new Map(linhas.map((l) => [l.mes, l.frete.toNumber()]));
  const chave = (a: number, m: number) => `${a}-${String(m).padStart(2, "0")}`;

  const meses: MesMei[] = [];
  let vendido = 0;
  let projecao = 0;
  let semHistorico = false;
  let frete = 0;
  let freteProjecao = 0;
  for (let m = 1; m <= 12; m++) {
    const real = porMes.get(chave(ano, m)) ?? 0;
    const anoPassado = porMes.get(chave(ano - 1, m));
    const freteReal = fretePorMes.get(chave(ano, m)) ?? 0;
    const freteAnoPassado = fretePorMes.get(chave(ano - 1, m)) ?? 0;
    if (m <= mesAtual) frete += freteReal;
    freteProjecao += m < mesAtual ? freteReal : m === mesAtual ? Math.max(freteReal, freteAnoPassado) : freteAnoPassado;
    if (m < mesAtual) {
      vendido += real;
      projecao += real;
      meses.push({ mes: chave(ano, m), receita: real, projetado: false });
    } else {
      if (m === mesAtual) vendido += real;
      if (anoPassado === undefined) semHistorico = true;
      const valor = m === mesAtual ? Math.max(real, anoPassado ?? 0) : (anoPassado ?? 0);
      projecao += valor;
      meses.push({ mes: chave(ano, m), receita: valor, projetado: m > mesAtual || valor > real });
    }
  }

  return {
    ano,
    vendido,
    projecao,
    pctVendido: (vendido / TETO_MEI) * 100,
    pctProjecao: (projecao / TETO_MEI) * 100,
    meses,
    semHistorico,
    frete,
    freteProjecao,
    pctComFrete: ((vendido + frete) / TETO_MEI) * 100,
    pctProjecaoComFrete: ((projecao + freteProjecao) / TETO_MEI) * 100,
  };
}
