import { prisma } from "@/lib/db";
import { analisarPreco, metaDoTipo, type ParametrosAnalise } from "./analise";
import { nomeVariante, type Custos } from "./custo";

export type AlertaMaterial = {
  materialId: string;
  material: string;
  unidade: string;
  antes: number;
  agora: number;
  subiuPct: number;
  data: Date;
  produtos: { produtoId: string; rotulo: string; margemPct: number; meta: number }[];
};

const LIMIAR = 3; // % de alta que ja merece aviso

// Materiais cuja ultima compra ficou mais cara que a anterior, com os produtos
// que usam o material e agora estao abaixo da meta de margem.
export async function carregarAlertasMateriais(custos: Custos, p: ParametrosAnalise): Promise<AlertaMaterial[]> {
  const [compras, ficha] = await Promise.all([
    prisma.compra.findMany({
      select: { materialId: true, data: true, custoUnitario: true, material: { select: { nome: true, unidade: true } } },
      orderBy: [{ data: "desc" }, { createdAt: "desc" }],
    }),
    prisma.fichaTecnicaItem.findMany({ select: { materialId: true, produtoId: true, varianteId: true } }),
  ]);

  const porMaterial = new Map<string, typeof compras>();
  for (const c of compras) porMaterial.set(c.materialId, [...(porMaterial.get(c.materialId) ?? []), c]);

  const alertas: AlertaMaterial[] = [];
  for (const [materialId, lista] of porMaterial) {
    if (lista.length < 2) continue;
    const [ultima, anterior] = lista;
    const agora = ultima.custoUnitario.toNumber();
    const antes = anterior.custoUnitario.toNumber();
    if (antes <= 0 || ((agora - antes) / antes) * 100 < LIMIAR) continue;

    const produtos: AlertaMaterial["produtos"] = [];
    const usos = ficha.filter((f) => f.materialId === materialId);
    const vistos = new Set<string>();
    for (const u of usos) {
      const produto = custos.produtos.get(u.produtoId);
      if (!produto || (produto.tipo !== "producao_propria" && produto.tipo !== "kit")) continue;
      const variantes = produto.variantes.filter((v) => v.ativa && (u.varianteId === null || v.id === u.varianteId));
      for (const v of variantes) {
        if (vistos.has(v.id)) continue;
        vistos.add(v.id);
        const custo = custos.daVariante(v.id);
        const preco = v.preco?.toNumber();
        if (!custo || !preco) continue;
        const meta = metaDoTipo(p, produto.tipo);
        const a = analisarPreco(custo.valor.toNumber(), preco, p, meta);
        if (a && a.status !== "ok") {
          produtos.push({ produtoId: produto.id, rotulo: nomeVariante(produto.title, v.title), margemPct: a.contribuicaoPct, meta });
        }
      }
    }
    alertas.push({
      materialId,
      material: ultima.material.nome,
      unidade: ultima.material.unidade,
      antes,
      agora,
      subiuPct: ((agora - antes) / antes) * 100,
      data: ultima.data,
      produtos: produtos.sort((x, y) => x.margemPct - x.meta - (y.margemPct - y.meta)),
    });
  }
  return alertas.sort((a, b) => b.produtos.length - a.produtos.length || b.subiuPct - a.subiuPct);
}
