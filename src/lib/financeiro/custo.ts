import { Prisma, type FichaTecnicaItem, type Material, type Produto } from "@prisma/client";

type ProdutoComFicha = Produto & {
  fichaTecnica: (FichaTecnicaItem & { material: Material })[];
};

export interface CustoCalculado {
  valor: Prisma.Decimal;
  // true quando algum material da ficha ainda nao tem compra registrada
  // (custo zero) -- o valor existe, mas esta subestimado.
  incompleto: boolean;
}

// Producao propria: soma(quantidade de cada material * custo atual dele).
// Revenda: custo de compra direto do produto pronto.
// null quando falta informacao (nao classificado, sem ficha ou sem custo).
export function calcularCusto(produto: ProdutoComFicha): CustoCalculado | null {
  if (produto.tipo === "revenda") {
    return produto.custoCompra ? { valor: produto.custoCompra, incompleto: false } : null;
  }

  if (produto.tipo === "producao_propria") {
    if (produto.fichaTecnica.length === 0) return null;
    const valor = produto.fichaTecnica.reduce(
      (total, item) => total.plus(item.quantidade.times(item.material.custoAtual)),
      new Prisma.Decimal(0)
    );
    const incompleto = produto.fichaTecnica.some((item) => item.material.custoAtual.isZero());
    return { valor, incompleto };
  }

  return null;
}
