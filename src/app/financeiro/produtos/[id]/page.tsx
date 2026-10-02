import Link from "next/link";
import { notFound } from "next/navigation";
import { getMateriais, getProduto } from "@/lib/financeiro/queries";
import { calcularCusto } from "@/lib/financeiro/custo";
import { formatarReais } from "@/lib/financeiro/formato";
import { ClassificarProduto } from "@/components/financeiro/ClassificarProduto";
import { CustoCompraForm } from "@/components/financeiro/CustoCompraForm";
import { FichaTecnicaEditor } from "@/components/financeiro/FichaTecnicaEditor";
import { StatusShopify } from "@/components/financeiro/StatusShopify";
import { SugestaoPreco } from "@/components/financeiro/SugestaoPreco";

export const dynamic = "force-dynamic";

export default async function ProdutoPage({ params }: PageProps<"/financeiro/produtos/[id]">) {
  const { id } = await params;
  const [produto, materiais] = await Promise.all([getProduto(id), getMateriais()]);
  if (!produto) notFound();

  const custo = calcularCusto(produto);
  const custoNum = custo?.valor.toNumber() ?? null;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/financeiro" className="text-xs text-muted hover:text-ink">
          ← Voltar pra lista de produtos
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h2 className="font-serif text-2xl font-semibold text-ink">{produto.title}</h2>
          <StatusShopify status={produto.status} />
        </div>
        {produto.url && (
          <a href={produto.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted underline">
            Ver no site
          </a>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted">Esse produto é</span>
        <ClassificarProduto produtoId={produto.id} tipo={produto.tipo ?? ""} />
      </div>

      {produto.tipo && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-ink px-6 py-5 text-background">
          <div>
            <p className="text-xs uppercase tracking-wide text-background/60">Custo de uma unidade</p>
            <p className="font-serif text-3xl font-semibold">
              {custoNum !== null ? formatarReais(custoNum) : "—"}
            </p>
            {custo?.incompleto && (
              <p className="mt-1 text-xs text-accent">
                Incompleto: algum material ainda não tem compra registrada.
              </p>
            )}
            {custoNum === null && (
              <p className="mt-1 text-xs text-background/70">
                {produto.tipo === "revenda" ? "Informe o custo de compra abaixo." : "Monte a ficha técnica abaixo."}
              </p>
            )}
          </div>
          {custoNum !== null && custoNum > 0 && (
            <div className="rounded-xl bg-background px-3 py-2">
              <p className="mb-1 text-[11px] text-muted">Preço sugerido</p>
              <SugestaoPreco custo={custoNum} />
            </div>
          )}
        </div>
      )}

      {produto.tipo === null && (
        <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted">
          Escolha acima se é produção própria (tem ficha técnica com materiais) ou revenda (você compra
          pronto).
        </p>
      )}

      {produto.tipo === "revenda" && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-ink">Custo de compra</h3>
          <CustoCompraForm produtoId={produto.id} custoCompra={produto.custoCompra?.toNumber() ?? null} />
        </section>
      )}

      {produto.tipo === "producao_propria" && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-ink">Ficha técnica</h3>
          <FichaTecnicaEditor
            produtoId={produto.id}
            itens={produto.fichaTecnica.map((item) => ({
              id: item.id,
              quantidade: item.quantidade.toNumber(),
              material: {
                id: item.material.id,
                nome: item.material.nome,
                unidade: item.material.unidade,
                custoAtual: item.material.custoAtual.toNumber(),
              },
            }))}
            materiais={materiais.map((m) => ({
              id: m.id,
              nome: m.nome,
              unidade: m.unidade,
              custoAtual: m.custoAtual.toNumber(),
            }))}
          />
        </section>
      )}
    </div>
  );
}
