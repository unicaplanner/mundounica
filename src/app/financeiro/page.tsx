import Link from "next/link";
import { getProdutos, getResumoProdutos, type FiltroTipo } from "@/lib/financeiro/queries";
import { carregarCustos } from "@/lib/financeiro/custo";
import { formatarReais } from "@/lib/financeiro/formato";
import { ClassificarProduto } from "@/components/financeiro/ClassificarProduto";
import { SincronizarProdutos } from "@/components/financeiro/SincronizarProdutos";
import { StatusShopify } from "@/components/financeiro/StatusShopify";
import { carregarParametros } from "@/lib/financeiro/precificacao";
import { precoSugerido } from "@/lib/financeiro/analise";
import { botaoSecundario, campo } from "@/components/financeiro/estilos";

export const dynamic = "force-dynamic";

const FILTROS: { valor: FiltroTipo; rotulo: string }[] = [
  { valor: "nao_classificados", rotulo: "Não classificados" },
  { valor: "producao_propria", rotulo: "Produção própria" },
  { valor: "revenda", rotulo: "Revenda" },
  { valor: "kit", rotulo: "Kit" },
  { valor: "todos", rotulo: "Todos" },
];

function linkFiltro(filtro: FiltroTipo, busca?: string) {
  const params = new URLSearchParams({ filtro });
  if (busca) params.set("busca", busca);
  return `/financeiro?${params}`;
}

export default async function ProdutosPage({ searchParams }: PageProps<"/financeiro">) {
  const params = await searchParams;
  const busca = typeof params.busca === "string" ? params.busca.trim() : "";
  const filtro = (FILTROS.find((f) => f.valor === params.filtro)?.valor ?? "nao_classificados") as FiltroTipo;

  const [produtos, resumo, custos, parametros] = await Promise.all([
    getProdutos({ busca, filtro }),
    getResumoProdutos(),
    carregarCustos(),
    carregarParametros(),
  ]);

  if (resumo.total === 0) {
    return (
      <div className="space-y-4 rounded-2xl border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted">
          Ainda não tem produtos aqui. Puxe o catálogo do Shopify pra começar a classificar.
        </p>
        <div className="flex justify-center">
          <SincronizarProdutos />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {resumo.naoClassificados > 0 ? (
            <>
              <span className="font-semibold text-alerta">{resumo.naoClassificados}</span> produtos ainda sem
              classificação.
            </>
          ) : (
            "Todos os produtos ativos estão classificados."
          )}
          {resumo.ultimaSync && (
            <span className="block text-xs">
              Catálogo atualizado em{" "}
              {resumo.ultimaSync.toLocaleString("pt-BR", {
                timeZone: "America/Sao_Paulo",
                dateStyle: "short",
                timeStyle: "short",
              })}
              .
            </span>
          )}
        </p>
        <SincronizarProdutos />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <form method="get" action="/financeiro" className="flex flex-wrap items-center gap-2">
          <label htmlFor="busca" className="sr-only">
            Buscar produto
          </label>
          <input id="busca" type="search" name="busca" defaultValue={busca} placeholder="Buscar produto..." className={`${campo} w-56`} />
          <input type="hidden" name="filtro" value={filtro} />
          <button type="submit" className={botaoSecundario}>
            Buscar
          </button>
        </form>
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          {FILTROS.map((f) => (
            <Link
              key={f.valor}
              href={linkFiltro(f.valor, busca)}
              aria-current={filtro === f.valor ? "page" : undefined}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                filtro === f.valor ? "bg-ink text-background" : "bg-accent-soft text-ink/70 hover:bg-border"
              }`}
            >
              {f.rotulo}
            </Link>
          ))}
        </div>
      </div>

      {produtos.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted">
          {busca ? `Nenhum produto com "${busca}" nesse filtro.` : "Nenhum produto nesse filtro."}
        </p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {produtos.map((produto) => {
            const r = custos.resumo(produto.id);
            const unico = r?.modo === "unico" ? r.custo : null;
            const custoNum = unico ? unico.valor.toNumber() : null;
            const nVariantes = produto._count.variantes;
            const sugerido = custoNum !== null && custoNum > 0 ? precoSugerido(custoNum, parametros) : null;

            return (
              <li key={produto.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                <div className="min-w-0 flex-1 basis-60">
                  <Link
                    href={`/financeiro/produtos/${produto.id}`}
                    className="text-sm font-semibold text-ink hover:underline"
                  >
                    {produto.title}
                  </Link>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <StatusShopify status={produto.status} />
                    {nVariantes > 1 && (
                      <span>
                        {nVariantes} variantes{produto.custoPorVariante && produto.tipo ? " · custo por variante" : ""}
                      </span>
                    )}
                  </div>
                </div>

                <ClassificarProduto produtoId={produto.id} tipo={produto.tipo ?? ""} abrirProdutoAoClassificar />

                <div className="w-36 text-right text-xs tabular-nums">
                  {r?.modo === "variante" ? (
                    r.min === null ? (
                      <span className="text-muted">sem custo</span>
                    ) : (
                      <>
                        <span className="font-semibold text-ink">
                          {r.min.equals(r.max!)
                            ? formatarReais(r.min.toNumber())
                            : `${formatarReais(r.min.toNumber())} a ${formatarReais(r.max!.toNumber())}`}
                        </span>
                        {r.incompleto && (
                          <span className="block text-alerta">
                            {r.comCusto < r.total ? `${r.comCusto} de ${r.total} com custo` : "custo incompleto"}
                          </span>
                        )}
                      </>
                    )
                  ) : custoNum !== null ? (
                    <>
                      <span className="font-semibold text-ink">{formatarReais(custoNum)}</span>
                      {unico?.incompleto && <span className="block text-alerta">custo incompleto</span>}
                    </>
                  ) : (
                    <span className="text-muted">sem custo</span>
                  )}
                </div>

                <div className="w-32 text-right text-xs tabular-nums">
                  {sugerido !== null && (
                    <>
                      <span className="block text-muted">sugerido</span>
                      <span className="font-semibold text-ink">{formatarReais(sugerido)}</span>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {produtos.length === 60 && (
        <p className="text-xs text-muted">
          Mostrando os 60 primeiros (ativos antes dos rascunhos). Use a busca pra achar outros.
        </p>
      )}
    </div>
  );
}
