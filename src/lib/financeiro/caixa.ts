import { prisma } from "@/lib/db";
import { carregarResultados } from "./resultado";

// Fluxo de caixa projetado pros proximos 90 dias, a partir do saldo em conta
// informado. Cada mes futuro vende o mesmo que o mesmo mes do ano passado (sem
// historico: a media dos ultimos 3 meses fechados). Desse valor saem:
// - reposicao de material e produtos de revenda (o custo dos produtos vendidos,
//   sem a mao de obra, que e a Lari e entra como pro-labore)
// - embalagem de envio (pedidos x custo medio)
// - taxas de cartao/gateway
// - custos fixos, inclusive o pro-labore
// Tudo espalhado igual pelos dias do mes. O frete cobrado entra e sai (vai pra
// transportadora), entao fica de fora.

export type MesCaixa = {
  mes: string;
  dias: number; // dias deste mes dentro da projecao
  base: "ano_passado" | "media" | "real";
  vendas: number;
  materiais: number;
  embalagem: number;
  taxas: number;
  fixos: number;
  saldo: number; // entradas - saidas nos dias da projecao
};

export type PontoCaixa = { dia: string; saldo: number };

export type FluxoCaixa = {
  saldoInicial: number | null;
  saldoEm: Date | null;
  saldoVelho: boolean; // informado ha mais de um mes
  pontos: PontoCaixa[]; // de hoje ate 90 dias
  marcos: { dias: number; dia: string; saldo: number }[];
  menor: PontoCaixa | null;
  meses: MesCaixa[];
  semHistorico: boolean;
};

const fmtDia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
const diaUTC = (s: string) => new Date(`${s}T00:00:00Z`);
const somaDias = (s: string, n: number) => fmtDia.format(new Date(diaUTC(s).getTime() + n * 86400000 + 12 * 3600000));
const diasNoMes = (mes: string) => {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
};
const mesAnterior = (mes: string, anos: number) => {
  const [a, m] = mes.split("-");
  return `${Number(a) - anos}-${m}`;
};

export async function carregarFluxoCaixa(): Promise<FluxoCaixa> {
  const [r, config] = await Promise.all([
    carregarResultados(),
    prisma.configuracaoPrecificacao.findUnique({ where: { id: "unica" }, select: { saldoCaixa: true, saldoCaixaEm: true } }),
  ]);
  const saldoInicial = config?.saldoCaixa?.toNumber() ?? null;
  const saldoEm = config?.saldoCaixaEm ?? null;

  const porMes = new Map(r.meses.map((m) => [m.mes, m]));
  const fechados = r.meses.filter((m) => !m.parcial);
  const doze = fechados.slice(-12);
  const tres = fechados.slice(-3);
  const somaVendas = doze.reduce((a, m) => a + m.vendas, 0);
  const razaoMateriais = somaVendas > 0 ? doze.reduce((a, m) => a + m.produtos, 0) / somaVendas : 0;
  const media = (f: (m: (typeof tres)[number]) => number) => (tres.length ? tres.reduce((a, m) => a + f(m), 0) / tres.length : 0);
  const ultimo = r.meses.at(-1);
  const fixosMes = ultimo ? ultimo.fixosSemProLabore + ultimo.proLabore : 0;
  const envioPorPedido = r.envioPorPedido ?? 0;

  // quanto cada mes deve vender (e quantos pedidos)
  let semHistorico = false;
  const previsaoMes = (mes: string): { vendas: number; frete: number; pedidos: number; base: MesCaixa["base"] } => {
    const passado = porMes.get(mesAnterior(mes, 1));
    const real = porMes.get(mes);
    let prev: { vendas: number; frete: number; pedidos: number; base: MesCaixa["base"] };
    if (passado && !passado.parcial) prev = { vendas: passado.vendas, frete: passado.frete, pedidos: passado.pedidos, base: "ano_passado" };
    else {
      semHistorico = true;
      prev = { vendas: media((m) => m.vendas), frete: media((m) => m.frete), pedidos: media((m) => m.pedidos), base: "media" };
    }
    // mes que ja vendeu mais do que o previsto: vale o real
    if (real && real.vendas > prev.vendas) return { vendas: real.vendas, frete: real.frete, pedidos: real.pedidos, base: "real" };
    return prev;
  };

  const hoje = fmtDia.format(new Date());
  // o saldo informado vale no dia dele; de la ate hoje a projecao ja corre
  const inicio = saldoEm ? fmtDia.format(saldoEm) : hoje;
  const fim = somaDias(hoje, 90);

  const meses = new Map<string, MesCaixa>();
  const pontos: PontoCaixa[] = [];
  let saldo = saldoInicial ?? 0;
  for (let dia = inicio; dia <= fim; dia = somaDias(dia, 1)) {
    if (dia > inicio) {
      const mes = dia.slice(0, 7);
      let m = meses.get(mes);
      const n = diasNoMes(mes);
      const prev = previsaoMes(mes);
      if (!m) {
        m = { mes, dias: 0, base: prev.base, vendas: 0, materiais: 0, embalagem: 0, taxas: 0, fixos: 0, saldo: 0 };
        meses.set(mes, m);
      }
      const vendas = prev.vendas / n;
      const materiais = vendas * razaoMateriais;
      const embalagem = (prev.pedidos * envioPorPedido) / n;
      const taxas = ((prev.vendas + prev.frete) * r.taxasPct) / 100 / n;
      const fixos = fixosMes / n;
      m.dias += 1;
      m.vendas += vendas;
      m.materiais += materiais;
      m.embalagem += embalagem;
      m.taxas += taxas;
      m.fixos += fixos;
      const liquido = vendas - materiais - embalagem - taxas - fixos;
      m.saldo += liquido;
      saldo += liquido;
    }
    if (dia >= hoje) pontos.push({ dia, saldo });
  }

  const marcos = [30, 60, 90].map((d) => {
    const dia = somaDias(hoje, d);
    return { dias: d, dia, saldo: pontos.find((p) => p.dia === dia)?.saldo ?? pontos.at(-1)?.saldo ?? saldo };
  });
  const menor = pontos.reduce<PontoCaixa | null>((min, p) => (!min || p.saldo < min.saldo ? p : min), null);

  return {
    saldoInicial,
    saldoEm,
    saldoVelho: !!saldoEm && Date.now() - saldoEm.getTime() > 31 * 86400000,
    pontos,
    marcos,
    menor,
    meses: [...meses.values()].filter((m) => m.mes >= hoje.slice(0, 7) || m.dias > 0),
    semHistorico,
  };
}
