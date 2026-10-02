import Link from "next/link";
import { getMateriais } from "@/lib/financeiro/queries";
import { MaterialForm } from "@/components/financeiro/MaterialForm";
import { MateriaisTabela } from "@/components/financeiro/MateriaisTabela";

export const dynamic = "force-dynamic";

export default async function MateriaisPage() {
  const materiais = await getMateriais();

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm text-muted">
        Matéria-prima e embalagem usadas na produção própria. O custo de cada material é sempre o da
        compra mais recente registrada em{" "}
        <Link href="/financeiro/compras" className="text-ink underline">
          Compras
        </Link>
        , e atualiza sozinho o custo de todos os produtos que usam ele.
      </p>

      <div className="rounded-2xl border border-dashed border-border p-4">
        <MaterialForm />
      </div>

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
            usos: m._count.fichaTecnica,
          }))}
        />
      )}
    </div>
  );
}
