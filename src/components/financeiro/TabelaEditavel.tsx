"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type ReactNode } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { normalizarNumero } from "@/lib/financeiro/formato";
import { IconeLapis, IconeLixeira, botaoIcone } from "./Icones";
import { botaoPrimario, botaoSecundario, campo as estiloCampo, rotulo } from "./estilos";

export type CampoTabela = {
  chave: string;
  rotulo: string;
  placeholder?: string;
  numerico?: boolean;
  largura?: string; // classe de largura do campo, ex "w-28"
  sugestoes?: string[];
  opcoes?: string[]; // lista fechada (select) em vez de texto livre
};

export type LinhaTabela = {
  id: string;
  nome: string; // usado nos rotulos acessiveis ("Editar Contador")
  valores: Record<string, string>; // valores crus pra editar
  exibir: Record<string, ReactNode>; // valores formatados pra mostrar
  extras?: ReactNode[]; // colunas calculadas, so leitura
};

// Lista com cadastro, edicao (lapis) e exclusao (lixeira) inline, pros
// cadastros simples: custos fixos, despesas por venda, impressoras.
export function TabelaEditavel({
  campos,
  linhas,
  colunasExtras = [],
  endpoint,
  nomeItem,
  rotuloAdicionar,
  textoVazio,
}: {
  campos: CampoTabela[];
  linhas: LinhaTabela[];
  colunasExtras?: string[];
  endpoint: string;
  nomeItem: string;
  rotuloAdicionar: string;
  textoVazio: string;
}) {
  const id = useId();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const vazio = () => Object.fromEntries(campos.map((c) => [c.chave, ""]));
  const [novo, setNovo] = useState<Record<string, string>>(vazio);
  const [editando, setEditando] = useState<string | null>(null);
  const [edicao, setEdicao] = useState<Record<string, string>>({});
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [erro, setErro] = useState<{ onde: string; texto: string } | null>(null);

  const preparar = (valores: Record<string, string>) =>
    Object.fromEntries(campos.map((c) => [c.chave, c.numerico ? normalizarNumero(valores[c.chave] ?? "") : valores[c.chave] ?? ""]));

  async function executar(onde: string, url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) {
    setErro(null);
    const resultado = await enviar(url, method, body);
    if (!resultado.ok) {
      setErro({ onde, texto: resultado.erro });
      return false;
    }
    startTransition(() => router.refresh());
    return true;
  }

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (await executar("novo", endpoint, "POST", preparar(novo))) setNovo(vazio());
  }

  const listaSugestoes = (c: CampoTabela) => (c.sugestoes ? `${id}-${c.chave}-sugestoes` : undefined);

  return (
    <div className="space-y-4">
      {campos.map(
        (c) =>
          c.sugestoes && (
            <datalist key={c.chave} id={listaSugestoes(c)}>
              {c.sugestoes.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          )
      )}

      {linhas.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">{textoVazio}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm [&_td]:pr-4 [&_th]:pr-4">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                {campos.map((c) => (
                  <th key={c.chave} className="py-2 font-semibold">
                    {c.rotulo}
                  </th>
                ))}
                {colunasExtras.map((r) => (
                  <th key={r} className="py-2 font-semibold">
                    {r}
                  </th>
                ))}
                <th className="py-2">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => {
                const emEdicao = editando === l.id;
                const confirmando = excluindo === l.id;
                return (
                  <tr
                    key={l.id}
                    className={`border-b border-border ${emEdicao ? "bg-accent-soft/60" : ""} ${confirmando ? "bg-alerta-soft" : ""}`}
                  >
                    {campos.map((c) => (
                      <td key={c.chave} className="py-2.5 tabular-nums">
                        {emEdicao && c.opcoes ? (
                          <select
                            aria-label={c.rotulo}
                            value={edicao[c.chave] ?? ""}
                            onChange={(e) => setEdicao({ ...edicao, [c.chave]: e.target.value })}
                            className={`${estiloCampo} py-1 text-xs ${c.largura ?? "w-28"}`}
                          >
                            {c.opcoes.map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </select>
                        ) : emEdicao ? (
                          <input
                            type="text"
                            inputMode={c.numerico ? "decimal" : undefined}
                            list={listaSugestoes(c)}
                            aria-label={c.rotulo}
                            value={edicao[c.chave] ?? ""}
                            onChange={(e) => setEdicao({ ...edicao, [c.chave]: e.target.value })}
                            className={`${estiloCampo} py-1 text-xs ${c.largura ?? "w-28"}`}
                          />
                        ) : (
                          l.exibir[c.chave]
                        )}
                      </td>
                    ))}
                    {(l.extras ?? []).map((x, i) => (
                      <td key={i} className="py-2.5 tabular-nums text-muted">
                        {x}
                      </td>
                    ))}
                    <td className="py-1.5 text-right">
                      {emEdicao ? (
                        <div className="flex justify-end gap-2 whitespace-nowrap">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={async () => {
                              if (await executar(l.id, `${endpoint}/${l.id}`, "PATCH", preparar(edicao))) setEditando(null);
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
                          <span className="text-xs font-semibold text-alerta">Excluir {nomeItem}?</span>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={async () => {
                              setExcluindo(null);
                              await executar(l.id, `${endpoint}/${l.id}`, "DELETE");
                            }}
                            className="rounded-full bg-alerta px-3 py-1 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                          >
                            Excluir
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
                              setErro(null);
                              setExcluindo(null);
                              setEditando(l.id);
                              setEdicao({ ...l.valores });
                            }}
                            aria-label={`Editar ${l.nome}`}
                            title="Editar"
                            className={botaoIcone}
                          >
                            <IconeLapis />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setErro(null);
                              setEditando(null);
                              setExcluindo(l.id);
                            }}
                            aria-label={`Excluir ${l.nome}`}
                            title="Excluir"
                            className={botaoIcone}
                          >
                            <IconeLixeira />
                          </button>
                        </div>
                      )}
                      {erro?.onde === l.id && <p className="mt-1 max-w-xs text-left text-xs text-alerta">{erro.texto}</p>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={adicionar} className="space-y-3 rounded-2xl border border-dashed border-border p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{rotuloAdicionar}</p>
        <div className="flex flex-wrap items-end gap-3">
          {campos.map((c) => (
            <div key={c.chave}>
              <label htmlFor={`${id}-${c.chave}`} className={rotulo}>
                {c.rotulo}
              </label>
              {c.opcoes ? (
                <select
                  id={`${id}-${c.chave}`}
                  value={novo[c.chave] ?? ""}
                  onChange={(e) => setNovo({ ...novo, [c.chave]: e.target.value })}
                  className={`${estiloCampo} ${c.largura ?? "w-32"}`}
                >
                  <option value="">Escolha...</option>
                  {c.opcoes.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`${id}-${c.chave}`}
                  type="text"
                  inputMode={c.numerico ? "decimal" : undefined}
                  list={listaSugestoes(c)}
                  placeholder={c.placeholder}
                  value={novo[c.chave] ?? ""}
                  onChange={(e) => setNovo({ ...novo, [c.chave]: e.target.value })}
                  className={`${estiloCampo} ${c.largura ?? "w-32"}`}
                />
              )}
            </div>
          ))}
          <button type="submit" disabled={isPending} className={botaoPrimario}>
            Adicionar
          </button>
        </div>
        {erro?.onde === "novo" && <p className="text-xs text-alerta">{erro.texto}</p>}
      </form>
    </div>
  );
}
