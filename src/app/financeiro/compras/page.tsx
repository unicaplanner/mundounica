import { getComprasRecentes, getMateriais } from "@/lib/financeiro/queries";
import { CompraForm } from "@/components/financeiro/CompraForm";
import { ComprasTabela } from "@/components/financeiro/ComprasTabela";

export const dynamic = "force-dynamic";

const dataISO = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });

export default async function ComprasPage() {
  const [materiais, compras] = await Promise.all([getMateriais(), getComprasRecentes()]);
  const listaMateriais = materiais.map((m) => ({ id: m.id, nome: m.nome, unidade: m.unidade }));

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm text-muted">
        Lance aqui cada compra de material. O custo da compra mais recente vira o custo atual do material
        e já entra no cálculo de todos os produtos que usam ele. Lançou errado? Use o lápis pra corrigir
        ou a lixeira pra excluir.
      </p>

      <div className="rounded-2xl border border-dashed border-border p-4">
        <CompraForm materiais={listaMateriais} />
      </div>

      {compras.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted">
          Nenhuma compra registrada ainda.
        </p>
      ) : (
        <ComprasTabela
          materiais={listaMateriais}
          compras={compras.map((c) => ({
            id: c.id,
            data: dataISO.format(c.data),
            materialId: c.materialId,
            materialNome: c.material.nome,
            unidade: c.material.unidade,
            quantidade: c.quantidade.toNumber(),
            valorTotal: c.valorTotal.toNumber(),
            custoUnitario: c.custoUnitario.toNumber(),
            fornecedor: c.fornecedor,
          }))}
        />
      )}
    </div>
  );
}
