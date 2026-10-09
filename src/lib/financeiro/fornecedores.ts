import { prisma } from "@/lib/db";

// Link do WhatsApp: so numeros; numero brasileiro sem o 55 ganha o 55.
export function linkWhatsapp(numero: string | null): string | null {
  const n = (numero ?? "").replace(/\D/g, "");
  if (!n) return null;
  return `https://wa.me/${n.length <= 11 ? `55${n}` : n}`;
}

export async function getFornecedores() {
  const [fornecedores, compras] = await Promise.all([
    prisma.fornecedor.findMany({ orderBy: { nome: "asc" } }),
    prisma.compra.groupBy({
      by: ["fornecedorId"],
      where: { fornecedorId: { not: null } },
      _count: { _all: true },
      _sum: { valorTotal: true },
      _max: { data: true },
    }),
  ]);
  const porId = new Map(compras.map((c) => [c.fornecedorId, c]));
  return fornecedores.map((f) => {
    const c = porId.get(f.id);
    return {
      ...f,
      compras: c?._count._all ?? 0,
      totalGasto: c?._sum.valorTotal?.toNumber() ?? 0,
      ultimaCompra: c?._max.data ?? null,
    };
  });
}

// Ficha completa: compras (mais recentes primeiro), mensagens e, por
// material, a evolucao do preco unitario nas compras com esse fornecedor.
export async function getFornecedor(id: string) {
  const fornecedor = await prisma.fornecedor.findUnique({
    where: { id },
    include: {
      compras: { include: { material: true }, orderBy: [{ data: "desc" }, { createdAt: "desc" }] },
      mensagens: { orderBy: [{ data: "desc" }, { createdAt: "desc" }] },
    },
  });
  if (!fornecedor) return null;

  const porMaterial = new Map<
    string,
    { id: string; nome: string; unidade: string; precos: { data: Date; custoUnitario: number; quantidade: number }[] }
  >();
  for (const c of [...fornecedor.compras].reverse()) {
    const m = porMaterial.get(c.materialId) ?? { id: c.materialId, nome: c.material.nome, unidade: c.material.unidade, precos: [] };
    m.precos.push({ data: c.data, custoUnitario: c.custoUnitario.toNumber(), quantidade: c.quantidade.toNumber() });
    porMaterial.set(c.materialId, m);
  }
  return { ...fornecedor, materiais: [...porMaterial.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")) };
}
