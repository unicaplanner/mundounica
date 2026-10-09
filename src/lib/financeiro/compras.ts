import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { paraDecimal } from "./valores";

export type DadosCompra = {
  materialId: string;
  data: Date;
  quantidade: Prisma.Decimal;
  valorTotal: Prisma.Decimal;
  custoUnitario: Prisma.Decimal;
  fornecedor: string | null;
  fornecedorId: string | null;
};

// Acha o fornecedor pelo nome (sem diferenciar maiuscula) ou cria um novo.
export async function ligarFornecedor(nome: string | null): Promise<{ id: string; nome: string } | null> {
  const limpo = (nome ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
  if (!limpo) return null;
  const existente = await prisma.fornecedor.findFirst({
    where: { nome: { equals: limpo, mode: "insensitive" } },
    select: { id: true, nome: true },
  });
  if (existente) return existente;
  return prisma.fornecedor.create({ data: { nome: limpo }, select: { id: true, nome: true } });
}

// Valida o que veio do formulario de compra (criar ou editar).
export async function lerCompra(
  body: Record<string, unknown>
): Promise<{ ok: true; dados: DadosCompra } | { ok: false; erro: string }> {
  const quantidade = paraDecimal(body.quantidade);
  if (!quantidade || quantidade.isZero()) return { ok: false, erro: "Informe a quantidade comprada." };
  const valorTotal = paraDecimal(body.valorTotal);
  if (!valorTotal) return { ok: false, erro: "Informe o valor total pago, por exemplo 125,90." };

  const data = body.data ? new Date(`${body.data}T12:00:00`) : new Date();
  if (Number.isNaN(data.getTime())) return { ok: false, erro: "Data da compra inválida." };

  const material = await prisma.material.findUnique({
    where: { id: String(body.materialId) },
    select: { id: true },
  });
  if (!material) return { ok: false, erro: "Escolha um material da lista." };
  const fornecedor = await ligarFornecedor(String(body.fornecedor ?? ""));

  return {
    ok: true,
    dados: {
      materialId: material.id,
      data,
      quantidade,
      valorTotal,
      custoUnitario: valorTotal.dividedBy(quantidade),
      fornecedor: fornecedor?.nome ?? null,
      fornecedorId: fornecedor?.id ?? null,
    },
  };
}

// O custo atual do material e sempre o da compra mais recente pela data da
// compra (e zero se nao sobrou nenhuma). Roda depois de criar, editar ou
// excluir compra -- lancar uma compra antiga depois nao "volta" o preco.
export async function recalcularCustoAtual(tx: Prisma.TransactionClient, materialId: string) {
  const maisRecente = await tx.compra.findFirst({
    where: { materialId },
    orderBy: [{ data: "desc" }, { createdAt: "desc" }],
    select: { custoUnitario: true },
  });
  await tx.material.update({
    where: { id: materialId },
    data: { custoAtual: maisRecente?.custoUnitario ?? 0 },
  });
}
