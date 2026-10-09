import { prisma } from "@/lib/db";
import { mesesCompletos } from "./vendas";

// Estoque de materiais com baixa pelas vendas do Shopify.
// estoque atual = ultima contagem + compras depois dela - consumo depois dela
// consumo = vendas x quantidade na ficha (variante, produto ou dentro de kit)
//         + pedidos x materiais da embalagem de envio (media pelo % de cada caixa)
// As vendas sao mensais: no mes da contagem conta so a parte do mes depois dela.

export type EstoqueMaterial = {
  materialId: string;
  contado: number | null;
  contadoEm: Date | null;
  comprasDepois: number;
  consumoDepois: number;
  atual: number | null; // null sem contagem
  consumoMensal: number; // media dos ultimos 3 meses completos
  mesesRestantes: number | null;
};

type Qtd = Map<string, number>; // materialId -> quantidade

const somar = (alvo: Qtd, origem: Qtd, vezes: number) => {
  for (const [m, q] of origem) alvo.set(m, (alvo.get(m) ?? 0) + q * vezes);
};

export async function carregarEstoque(): Promise<Map<string, EstoqueMaterial>> {
  const [materiais, produtos, variantes, ficha, kit, vendas, resumos, envios, compras] = await Promise.all([
    prisma.material.findMany({ select: { id: true, estoqueContado: true, estoqueContadoEm: true } }),
    prisma.produto.findMany({ select: { id: true, tipo: true, custoPorVariante: true } }),
    prisma.variante.findMany({ select: { id: true, produtoId: true, shopifyVariantId: true } }),
    prisma.fichaTecnicaItem.findMany({ select: { produtoId: true, varianteId: true, materialId: true, quantidade: true } }),
    prisma.kitItem.findMany({ select: { kitProdutoId: true, kitVarianteId: true, componenteVarianteId: true, quantidade: true } }),
    prisma.vendaMensal.findMany({ where: { shopifyVariantId: { not: null } }, select: { mes: true, shopifyVariantId: true, quantidade: true } }),
    prisma.resumoMensal.findMany({ select: { mes: true, pedidos: true } }),
    prisma.tipoEnvio.findMany({ include: { materiais: true } }),
    prisma.compra.findMany({ select: { materialId: true, data: true, quantidade: true } }),
  ]);

  const produtoPorId = new Map(produtos.map((p) => [p.id, p]));
  const varPorId = new Map(variantes.map((v) => [v.id, v]));
  const varPorShopify = new Map(variantes.map((v) => [v.shopifyVariantId, v.id]));
  const fichaDe = (produtoId: string, varianteId: string | null) =>
    ficha.filter((f) => f.produtoId === produtoId && f.varianteId === varianteId);
  const kitDe = (produtoId: string, varianteId: string | null) =>
    kit.filter((k) => k.kitProdutoId === produtoId && k.kitVarianteId === varianteId);

  // materiais de uma unidade de cada variante (com kits dentro)
  const cache = new Map<string, Qtd>();
  const daVariante = (varianteId: string, pilha = new Set<string>()): Qtd => {
    if (cache.has(varianteId)) return cache.get(varianteId)!;
    const total: Qtd = new Map();
    const v = varPorId.get(varianteId);
    const p = v && produtoPorId.get(v.produtoId);
    if (p && (p.tipo === "producao_propria" || p.tipo === "kit") && !pilha.has(varianteId)) {
      const dono = p.custoPorVariante ? varianteId : null;
      for (const f of fichaDe(p.id, dono)) total.set(f.materialId, (total.get(f.materialId) ?? 0) + f.quantidade.toNumber());
      if (p.tipo === "kit") {
        for (const k of kitDe(p.id, dono)) somar(total, daVariante(k.componenteVarianteId, new Set([...pilha, varianteId])), k.quantidade.toNumber());
      }
    }
    cache.set(varianteId, total);
    return total;
  };

  // materiais de um pedido medio de envio
  const somaPct = envios.reduce((a, e) => a + e.percentual.toNumber(), 0);
  const porPedido: Qtd = new Map();
  if (somaPct > 0) {
    for (const e of envios) {
      for (const m of e.materiais) porPedido.set(m.materialId, (porPedido.get(m.materialId) ?? 0) + (m.quantidade.toNumber() * e.percentual.toNumber()) / somaPct);
    }
  }

  // consumo por mes
  const consumoMes = new Map<string, Qtd>();
  const doMes = (mes: string) => consumoMes.get(mes) ?? consumoMes.set(mes, new Map()).get(mes)!;
  for (const v of vendas) {
    const id = varPorShopify.get(v.shopifyVariantId!);
    if (id) somar(doMes(v.mes), daVariante(id), v.quantidade);
  }
  for (const r of resumos) somar(doMes(r.mes), porPedido, r.pedidos);

  const mesSP = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
  const ultimos3 = mesesCompletos(3);

  const resultado = new Map<string, EstoqueMaterial>();
  for (const m of materiais) {
    const consumoMensal = ultimos3.reduce((a, mes) => a + (consumoMes.get(mes)?.get(m.id) ?? 0), 0) / 3;
    let comprasDepois = 0;
    let consumoDepois = 0;
    let atual: number | null = null;
    if (m.estoqueContado !== null && m.estoqueContadoEm) {
      const [ano, mesNum, dia] = mesSP.format(m.estoqueContadoEm).split("-").map(Number);
      const mesContagem = `${ano}-${String(mesNum).padStart(2, "0")}`;
      const diasNoMes = new Date(Date.UTC(ano, mesNum, 0)).getUTCDate();
      for (const [mes, qtd] of consumoMes) {
        const q = qtd.get(m.id) ?? 0;
        if (mes > mesContagem) consumoDepois += q;
        else if (mes === mesContagem) consumoDepois += (q * (diasNoMes - dia)) / diasNoMes;
      }
      comprasDepois = compras
        .filter((c) => c.materialId === m.id && c.data > m.estoqueContadoEm!)
        .reduce((a, c) => a + c.quantidade.toNumber(), 0);
      atual = m.estoqueContado.toNumber() + comprasDepois - consumoDepois;
    }
    resultado.set(m.id, {
      materialId: m.id,
      contado: m.estoqueContado?.toNumber() ?? null,
      contadoEm: m.estoqueContadoEm,
      comprasDepois,
      consumoDepois,
      atual,
      consumoMensal,
      mesesRestantes: atual !== null && consumoMensal > 0 ? Math.max(atual, 0) / consumoMensal : null,
    });
  }
  return resultado;
}
