import { prisma } from "@/lib/db";
import { impressoraPadrao } from "./impressao";
import { mediasPedido } from "./vendas";

export type ItemEnvioMaterial = {
  id: string;
  quantidade: number;
  material: { id: string; nome: string; unidade: string; custoAtual: number; linkCompra: string | null; impresso: boolean };
};

export type TipoEnvioCalculado = {
  id: string;
  nome: string;
  quando: string | null;
  percentual: number;
  materiais: ItemEnvioMaterial[];
  minutos: number | null; // tempo de montar e embalar
  custo: number;
  // vazia, material sem compra registrada ou nenhuma impressora com paginas por ano
  incompleto: boolean;
};

export type ResumoEnvio = {
  tipos: TipoEnvioCalculado[];
  percentualTotal: number;
  custoMedio: number | null; // por pedido, ponderado pelo % de cada embalagem
  ticket: number | null; // valor medio de um pedido (12 meses)
  custoFolha: number | null; // folha impressa (impressora mais cara)
  valorHora: number | null;
  impressora: string | null; // nome dela
  itensPorPedido: number | null; // produtos num pedido, em media (12 meses)
  porProduto: number | null; // custo medio por pedido / produtos por pedido: o que cada produto vendido paga
};

// Materiais de envio que a Lari compra (nomes iguais aos cadastrados em
// Materiais, pra ligar as caixas padrao a eles).
export const MATERIAL = {
  caixaPlanner: "Caixa Planner 24x20x6",
  caixaBloco: "Caixa Bloco 24x16x4",
  caixaA4: "Caixa A4 30x22",
  sedaPlanner: "Papel de seda 30x68 (planner)",
  sedaBloco: "Papel de seda 25x35 (bloco)",
  etiqueta: "Etiqueta térmica 10x15",
  adesivo: "Adesivo",
};

// Os tipos que a Lari usa hoje, pra comecar sem digitar tudo. Os % sao uma
// estimativa feita com os pedidos de out/2025 a set/2026 seguindo as regras
// dela; ela ajusta na tela. Os itens entram se o material existir com esse
// nome (1 de cada por pedido; folhas de bloco e guia ela completa).
export const ENVIOS_PADRAO = [
  {
    nome: "Caixa Planner",
    quando: "Pedidos com case fichário (caixa 24x20x6)",
    percentual: 28,
    itens: [MATERIAL.caixaPlanner, MATERIAL.sedaPlanner, MATERIAL.adesivo, MATERIAL.etiqueta],
  },
  {
    nome: "Caixa Bloco",
    quando: "Só blocos e refis, nenhum case (caixa 24x16x4) — inclui Unica Box e Capa Rígida",
    percentual: 70,
    itens: [MATERIAL.caixaBloco, MATERIAL.sedaBloco, MATERIAL.adesivo, MATERIAL.etiqueta],
  },
  {
    nome: "Caixa A4",
    quando: "Itens A4 (ex: mensal destacável) ou pedidos muito grandes: mais de 1500 g e acima de R$ 500",
    percentual: 2,
    itens: [MATERIAL.caixaA4, MATERIAL.sedaPlanner, MATERIAL.adesivo, MATERIAL.etiqueta],
  },
];

export async function carregarEnvio(): Promise<ResumoEnvio> {
  const [tipos, { ticket, itensPorPedido }, impressoras, config] = await Promise.all([
    prisma.tipoEnvio.findMany({
      orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
      include: {
        materiais: { include: { material: true }, orderBy: { createdAt: "asc" } },
      },
    }),
    mediasPedido(),
    prisma.impressora.findMany(),
    prisma.configuracaoPrecificacao.findUnique({ where: { id: "unica" }, select: { valorHora: true } }),
  ]);
  const valorHora = config?.valorHora?.toNumber() ?? null;
  const padrao = impressoraPadrao(impressoras);
  const custoFolha = padrao?.custoFolha.toNumber() ?? null;

  const calculados: TipoEnvioCalculado[] = tipos.map((t) => {
    const materiais = t.materiais.map((m) => ({
      id: m.id,
      quantidade: m.quantidade.toNumber(),
      material: {
        id: m.material.id,
        nome: m.material.nome,
        unidade: m.material.unidade,
        custoAtual: m.material.custoAtual.toNumber(),
        linkCompra: m.material.linkCompra,
        impresso: m.material.impresso,
      },
    }));
    // folha impressa (ex: folhas de bloco pra experimentar, guia): papel + impressao
    const minutos = t.minutos?.toNumber() ?? null;
    const custo =
      materiais.reduce((acc, m) => acc + m.quantidade * (m.material.custoAtual + (m.material.impresso ? (custoFolha ?? 0) : 0)), 0) +
      (minutos && valorHora ? (minutos / 60) * valorHora : 0); // tempo de montar e embalar o pedido
    const incompleto =
      materiais.length === 0 ||
      materiais.some((m) => m.material.custoAtual === 0) ||
      (materiais.some((m) => m.material.impresso) && custoFolha === null);
    return { id: t.id, nome: t.nome, quando: t.quando, percentual: t.percentual.toNumber(), materiais, minutos, custo, incompleto };
  });

  // Media ponderada pelo % de cada embalagem. Se os % nao somam 100, divide
  // pelo total mesmo assim (ex: 30 + 60 = 90 vira 33% e 67%).
  const percentualTotal = calculados.reduce((acc, t) => acc + t.percentual, 0);
  const custoMedio =
    percentualTotal > 0 ? calculados.reduce((acc, t) => acc + t.custo * t.percentual, 0) / percentualTotal : null;
  const porProduto = custoMedio !== null && itensPorPedido ? custoMedio / itensPorPedido : null;

  return { tipos: calculados, percentualTotal, custoMedio, ticket, itensPorPedido, porProduto, custoFolha, valorHora, impressora: padrao?.nome ?? null };
}
