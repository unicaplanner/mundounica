import Link from "next/link";
import { getMateriais, getProdutosParaLote } from "@/lib/financeiro/queries";
import { carregarEstoque } from "@/lib/financeiro/estoque";
import { AplicarMaterialLote } from "@/components/financeiro/AplicarMaterialLote";
import { MaterialForm } from "@/components/financeiro/MaterialForm";
import { MateriaisTabela } from "@/components/financeiro/MateriaisTabela";

export const dynamic = "force-dynamic";

export default async function MateriaisPage() {
  const [materiais, lote, estoques] = await Promise.all([getMateriais(), getProdutosParaLote(), carregarEstoque()]);
  const acabando = materiais.filter((m) => {
    const e = estoques.get(m.id);
    return e && e.atual !== null && e.mesesRestantes !== null && e.mesesRestantes < 1;
  });

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm text-muted">
        Matéria-prima e embalagem usadas na produção própria e nos envios. O custo de cada material é sempre o da
        compra mais recente registrada em{" "}
        <Link href="/financeiro/compras" className="text-ink underline">
          Compras
        </Link>
        , e atualiza sozinho o custo de todos os produtos que usam ele.
      </p>

      {acabando.length > 0 && (
        <p className="rounded-2xl bg-alerta-soft px-4 py-3 text-sm text-alerta">
          <strong>Estoque acabando:</strong>{" "}
          {acabando.map((m, i) => (
            <span key={m.id}>
              {i > 0 && ", "}
              <Link href={`/financeiro/materiais/${m.id}`} className="underline">
                {m.nome}
              </Link>
            </span>
          ))}{" "}
          — pelo ritmo das vendas, dura menos de 1 mês.
        </p>
      )}

      <p className="text-xs text-muted">
        Clique no nome de um material pra ver o histórico de preço e registrar uma contagem de estoque. Depois da
        contagem, as vendas do Shopify dão baixa sozinhas.
      </p>

      <div className="rounded-2xl border border-dashed border-border p-4">
        <MaterialForm />
      </div>

      {materiais.length > 0 && (
        <AplicarMaterialLote
          materiais={materiais.map((m) => ({ id: m.id, nome: m.nome, unidade: m.unidade }))}
          produtos={lote.produtos}
          ficha={lote.ficha}
        />
      )}

      {materiais.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted">
          Nenhum material cadastrado ainda.
        </p>
      ) : (
        <MateriaisTabela
          materiais={materiais.map((m) => ({
            id: m.id,
            nome: m.nome,
            unidade: m.unidade,
            custoAtual: m.custoAtual.toNumber(),
            totalComprado: m.totalComprado.toNumber(),
            usos: m.produtosQueUsam,
            envios: m.enviosQueUsam,
            linkCompra: m.linkCompra,
            impresso: m.impresso,
            estoque: estoques.get(m.id)?.atual ?? null,
            mesesRestantes: estoques.get(m.id)?.mesesRestantes ?? null,
          }))}
        />
      )}
    </div>
  );
}
