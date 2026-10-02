"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { formatarQuantidade, formatarReais, normalizarBusca, normalizarNumero, paraCampo } from "@/lib/financeiro/formato";
import { IconeLapis, IconeLixeira, botaoIcone } from "./Icones";
import { botaoPrimario, botaoSecundario, campo, rotulo } from "./estilos";

export type ItemKit = {
  id: string;
  quantidade: number;
  componenteVarianteId: string;
  componenteProdutoId: string;
  rotulo: string;
  custo: number | null;
  incompleto: boolean;
};

export type CandidatoKit = { id: string; rotulo: string; custo: number | null };

const MAX_RESULTADOS = 8;

// Produtos (numa variante especifica) que formam o kit. varianteId nulo =
// composicao do kit inteiro; com variante, so daquela variante do kit.
export function KitEditor({
  produtoId,
  varianteId = null,
  itens,
  candidatos,
}: {
  produtoId: string;
  varianteId?: string | null;
  itens: ItemKit[];
  candidatos: CandidatoKit[];
}) {
  const id = useId();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busca, setBusca] = useState("");
  const [escolhido, setEscolhido] = useState<CandidatoKit | null>(null);
  const [quantidade, setQuantidade] = useState("1");
  const [erroMsg, setErroMsg] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [qtdEdicao, setQtdEdicao] = useState("");
  const [excluindo, setExcluindo] = useState<string | null>(null);

  const resultados = useMemo(() => {
    const termos = normalizarBusca(busca).split(/\s+/).filter(Boolean);
    if (termos.length === 0) return [];
    return candidatos
      .filter((c) => {
        const alvo = normalizarBusca(c.rotulo);
        return termos.every((t) => alvo.includes(t));
      })
      .slice(0, MAX_RESULTADOS);
  }, [busca, candidatos]);

  async function salvar(componenteVarianteId: string, qtd: string) {
    setErroMsg(null);
    const resultado = await enviar(`/api/financeiro/produtos/${produtoId}/kit`, "POST", {
      componenteVarianteId,
      quantidade: normalizarNumero(qtd),
      varianteId,
    });
    if (!resultado.ok) {
      setErroMsg(resultado.erro);
      return false;
    }
    startTransition(() => router.refresh());
    return true;
  }

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!escolhido) {
      setErroMsg("Busque e escolha um produto da lista.");
      return;
    }
    if (await salvar(escolhido.id, quantidade)) {
      setEscolhido(null);
      setBusca("");
      setQuantidade("1");
    }
  }

  async function remover(itemId: string) {
    setExcluindo(null);
    const resultado = await enviar(`/api/financeiro/produtos/${produtoId}/kit/${itemId}`, "DELETE");
    if (!resultado.ok) {
      setErroMsg(resultado.erro);
      return;
    }
    startTransition(() => router.refresh());
  }

  const total = itens.reduce((acc, item) => acc + item.quantidade * (item.custo ?? 0), 0);

  return (
    <div className="space-y-5">
      {itens.length === 0 ? (
        <p className="text-sm text-muted">Nenhum produto no kit ainda. Busque abaixo cada produto que vai dentro dele.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm [&_td]:pr-4 [&_th]:pr-4">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="pb-2 font-semibold">Produto</th>
                <th className="pb-2 font-semibold">Qtd</th>
                <th className="pb-2 font-semibold">Custo unitário</th>
                <th className="pb-2 text-right font-semibold">Subtotal</th>
                <th className="pb-2">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => {
                const emEdicao = editando === item.id;
                const confirmando = excluindo === item.id;
                return (
                  <tr
                    key={item.id}
                    className={`border-t border-border ${emEdicao ? "bg-accent-soft/60" : ""} ${confirmando ? "bg-alerta-soft" : ""}`}
                  >
                    <td className="py-2.5">
                      <Link href={`/financeiro/produtos/${item.componenteProdutoId}`} className="text-ink hover:underline">
                        {item.rotulo}
                      </Link>
                    </td>
                    <td className="py-2.5 tabular-nums">
                      {emEdicao ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          aria-label={`Quantidade de ${item.rotulo}`}
                          value={qtdEdicao}
                          onChange={(e) => setQtdEdicao(e.target.value)}
                          className={`${campo} w-16 py-1 text-xs`}
                        />
                      ) : (
                        formatarQuantidade(item.quantidade)
                      )}
                    </td>
                    <td className="py-2.5 tabular-nums">
                      {item.custo === null ? (
                        <Link href={`/financeiro/produtos/${item.componenteProdutoId}`} className="text-xs text-alerta underline">
                          produto sem custo
                        </Link>
                      ) : (
                        <span className="text-muted">
                          {formatarReais(item.custo)}
                          {item.incompleto && <span className="ml-1 text-xs text-alerta">(incompleto)</span>}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-right font-semibold tabular-nums">
                      {formatarReais(item.quantidade * (item.custo ?? 0))}
                    </td>
                    <td className="py-1.5 text-right">
                      {emEdicao ? (
                        <div className="flex justify-end gap-2 whitespace-nowrap">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={async () => {
                              if (await salvar(item.componenteVarianteId, qtdEdicao)) setEditando(null);
                            }}
                            className={`${botaoPrimario} px-3 py-1 text-xs`}
                          >
                            Salvar
                          </button>
                          <button type="button" onClick={() => setEditando(null)} className={botaoSecundario}>
                            Cancelar
                          </button>
                        </div>
                      ) : confirmando ? (
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          <span className="text-xs font-semibold text-alerta">Tirar do kit?</span>
                          <button
                            type="button"
                            onClick={() => remover(item.id)}
                            disabled={isPending}
                            className="rounded-full bg-alerta px-3 py-1 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                          >
                            Tirar
                          </button>
                          <button type="button" onClick={() => setExcluindo(null)} className={botaoSecundario}>
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setExcluindo(null);
                              setEditando(item.id);
                              setQtdEdicao(paraCampo(item.quantidade));
                            }}
                            aria-label={`Editar quantidade de ${item.rotulo}`}
                            title="Editar quantidade"
                            className={botaoIcone}
                          >
                            <IconeLapis />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditando(null);
                              setExcluindo(item.id);
                            }}
                            aria-label={`Tirar ${item.rotulo} do kit`}
                            title="Tirar do kit"
                            className={botaoIcone}
                          >
                            <IconeLixeira />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-ink/20">
                <td colSpan={3} className="pt-2.5 text-right text-xs font-semibold text-muted">
                  Produtos do kit
                </td>
                <td className="pt-2.5 text-right font-bold tabular-nums text-ink">{formatarReais(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <form onSubmit={adicionar} className="space-y-3 rounded-2xl border border-dashed border-border p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Adicionar produto ao kit</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1 basis-64">
            <label htmlFor={`${id}-busca`} className={rotulo}>
              Produto (busque pelo nome e pela variante, ex: &ldquo;bloco clean a5 90&rdquo;)
            </label>
            {escolhido ? (
              <div className="flex items-center gap-2 rounded-md border border-accent-ink bg-card px-2.5 py-1.5 text-sm">
                <span className="min-w-0 flex-1 truncate text-ink">{escolhido.rotulo}</span>
                <button
                  type="button"
                  onClick={() => setEscolhido(null)}
                  className="text-xs text-muted underline hover:text-ink"
                >
                  Trocar
                </button>
              </div>
            ) : (
              <input
                id={`${id}-busca`}
                type="search"
                autoComplete="off"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar produto..."
                className={`${campo} w-full`}
              />
            )}
          </div>
          <div>
            <label htmlFor={`${id}-qtd`} className={rotulo}>
              Quantidade
            </label>
            <input
              id={`${id}-qtd`}
              type="text"
              inputMode="decimal"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              className={`${campo} w-20`}
            />
          </div>
          <button type="submit" disabled={isPending} className={botaoPrimario}>
            Adicionar
          </button>
        </div>

        {!escolhido && busca.trim() !== "" && (
          <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-card">
            {resultados.length === 0 ? (
              <li className="px-3 py-2 text-xs text-muted">Nenhum produto encontrado. Kits não entram em outros kits.</li>
            ) : (
              resultados.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setEscolhido(c);
                      setErroMsg(null);
                    }}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent-soft"
                  >
                    <span className="min-w-0 truncate text-ink">{c.rotulo}</span>
                    <span className="shrink-0 text-xs tabular-nums text-muted">
                      {c.custo === null ? "sem custo" : formatarReais(c.custo)}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
        {erroMsg && <p className="text-xs text-alerta">{erroMsg}</p>}
      </form>
    </div>
  );
}
