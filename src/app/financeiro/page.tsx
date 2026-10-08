import Link from "next/link";
import { getProdutos, getResumoProdutos, type FiltroTipo } from "@/lib/financeiro/queries";
import { carregarCustos, type Custos } from "@/lib/financeiro/custo";
import { carregarVendas } from "@/lib/financeiro/vendas";
import { formatarReais } from "@/lib/financeiro/formato";
import { carregarParametros } from "@/lib/financeiro/precificacao";
import { metaDoTipo, precoSugerido } from "@/lib/financeiro/analise";
import { ClassificarEmLote } from "@/components/financeiro/ClassificarEmLote";
import { ClassificarProduto } from "@/components/financeiro/ClassificarProduto";
import { SincronizarProdutos } from "@/components/financeiro/SincronizarProdutos";
import { StatusShopify } from "@/components/financeiro/StatusShopify";
import { botaoSecundario, campo } from "@/components/financeiro/estilos";

export const dynamic = "force-dynamic";

const LIMITE = 60;
const FORM_LOTE = "classificar-lote";

const FILTROS: { valor: FiltroTipo; rotulo: string }[] = [
  { valor: "nao_classificados", rotulo: "Não classificados" },
  { valor: "sem_custo", rotulo: "Sem custo" },
  { valor: "producao_propria", rotulo: "Produção própria" },
  { valor: "revenda", rotulo: "Revenda" },
  { valor: "kit", rotulo: "Kit" },
  { valor: "ignorar", rotulo: "Não contar" },
  { valor: "todos", rotulo: "Todos" },
];

function linkFiltro(filtro: FiltroTipo, busca?: string) {
  const params = new URLSearchParams({ filtro });
  if (busca) params.set("busca", busca);
  return `/financeiro?${params}`;
}

// Classificado, mas com alguma variante ativa ainda sem custo.
function faltaCusto(custos: Custos, produtoId: string) {
  const r = custos.resumo(produtoId);
  if (!r) return false;
  return r.modo === "unico" ? r.custo === null : r.comCusto < r.total;
}

const pct = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: n < 10 ? 1 : 0 })}%`;

export default async function ProdutosPage({ searchParams }: PageProps<"/financeiro">) {
  const params = await searchParams;
  const busca = typeof params.busca === "string" ? params.busca.trim() : "";
  const filtro = (FILTROS.find((f) => f.valor === params.filtro)?.valor ?? "nao_classificados") as FiltroTipo;

  const [todos, resumo, custos, parametros, vendas] = await Promise.all([
    getProdutos({ busca, filtro }),
    getResumoProdutos(),
    carregarCustos(),
    carregarParametros(),
    carregarVendas(),
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

  // Mais vendidos primeiro: e a fila de cadastro (cadastrar os campeoes de
  // venda primeiro ja cobre a maior parte do faturamento).
  const receitaDe = (id: string) => vendas.porProduto.get(id) ?? 0;
  const filtrados = filtro === "sem_custo" ? todos.filter((p) => faltaCusto(custos, p.id)) : todos;
  const produtos = [...filtrados].sort((a, b) => receitaDe(b.id) - receitaDe(a.id)).slice(0, LIMITE);

  // Quanto do faturamento dos 12 meses ja tem custo cadastrado. "Nao contar"
  // entra como resolvido: e brinde, nao precisa de custo.
  let comCusto = 0;
  for (const [varianteId, venda] of vendas.porVariante) {
    const v = custos.variantes.get(varianteId);
    const tipo = v ? custos.produtos.get(v.produtoId)?.tipo : null;
    if (tipo === "ignorar" || custos.daVariante(varianteId)) comCusto += venda.receita;
  }
  const cobertura = vendas.total > 0 ? (comCusto / vendas.total) * 100 : null;

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-2xl border border-border bg-card px-5 py-4">
        {cobertura === null ? (
          <p className="text-sm text-muted">
            Clique em <strong>Atualizar produtos e vendas do Shopify</strong> pra ver quais produtos vendem mais e
            começar o cadastro por eles.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm text-ink">
                <span className="font-serif text-2xl font-semibold">{pct(cobertura)}</span> das vendas dos últimos 12
                meses já têm custo cadastrado
              </p>
              <p className="text-xs text-muted">
                {formatarReais(comCusto)} de {formatarReais(vendas.total)}
              </p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-accent-soft" aria-hidden="true">
              <div className="h-full rounded-full bg-ok" style={{ width: `${Math.min(cobertura, 100)}%` }} />
            </div>
            <p className="text-xs text-muted">
              A lista abaixo vem em ordem dos mais vendidos: cadastrando o custo dos primeiros, essa barra enche rápido.
            </p>
          </>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <p className="text-xs text-muted">
            {resumo.naoClassificados > 0 ? (
              <>
                <span className="font-semibold text-alerta">{resumo.naoClassificados}</span> produtos ativos sem
                classificação.
              </>
            ) : (
              "Todos os produtos ativos estão classificados."
            )}
            {resumo.ultimaSync && (
              <span className="block">
                Atualizado do Shopify em{" "}
                {(vendas.atualizadoEm ?? resumo.ultimaSync).toLocaleString("pt-BR", {
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
        <>
          <form id={FORM_LOTE} />
          <ClassificarEmLote key={`${filtro}-${busca}`} formId={FORM_LOTE} />
          <ul className="divide-y divide-border border-y border-border">
            {produtos.map((produto) => {
              const r = custos.resumo(produto.id);
              const unico = r?.modo === "unico" ? r.custo : null;
              const custoNum = unico ? unico.valor.toNumber() : null;
              const nVariantes = produto._count.variantes;
              const sugerido = custoNum !== null && custoNum > 0 ? precoSugerido(custoNum, parametros, metaDoTipo(parametros, produto.tipo)) : null;
              const receita = receitaDe(produto.id);

              return (
                <li key={produto.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                  <input
                    type="checkbox"
                    name="ids"
                    value={produto.id}
                    form={FORM_LOTE}
                    aria-label={`Marcar ${produto.title}`}
                    className="size-4 accent-ink"
                  />
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
                      {receita > 0 && (
                        <span className="text-ink/70">
                          vendeu {formatarReais(receita)} em 12 meses
                          {vendas.total > 0 ? ` · ${pct((receita / vendas.total) * 100)} das vendas` : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  <ClassificarProduto produtoId={produto.id} tipo={produto.tipo ?? ""} abrirProdutoAoClassificar />

                  <div className="w-36 text-right text-xs tabular-nums">
                    {produto.tipo === "ignorar" ? (
                      <span className="text-muted">não conta</span>
                    ) : r?.modo === "variante" ? (
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
        </>
      )}

      {filtrados.length > LIMITE && (
        <p className="text-xs text-muted">
          Mostrando os {LIMITE} mais vendidos de {filtrados.length}. Use a busca pra achar outros.
        </p>
      )}
    </div>
  );
}
