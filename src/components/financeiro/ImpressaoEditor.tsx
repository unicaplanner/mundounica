"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { formatarQuantidade, formatarReais, normalizarNumero, paraCampo } from "@/lib/financeiro/formato";
import { IconeLapis, IconeLixeira, botaoIcone } from "./Icones";
import { botaoPrimario, botaoSecundario, campo, rotulo } from "./estilos";

export type ImpressoraOpcao = { id: string; nome: string; custoFolha: number | null };
export type ItemImpressao = { id: string; impressoraId: string; nome: string; folhas: number; custoFolha: number | null };

// Folhas impressas por unidade, por impressora; toda folha conta frente e
// verso. varianteId nulo =
// composicao do produto inteiro.
export function ImpressaoEditor({
  produtoId,
  varianteId = null,
  itens,
  impressoras,
}: {
  produtoId: string;
  varianteId?: string | null;
  itens: ItemImpressao[];
  impressoras: ImpressoraOpcao[];
}) {
  const id = useId();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [impressoraId, setImpressoraId] = useState(impressoras[0]?.id ?? "");
  const [folhas, setFolhas] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [folhasEdicao, setFolhasEdicao] = useState("");
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  async function salvar(impId: string, qtd: string) {
    setErroMsg(null);
    const resultado = await enviar(`/api/financeiro/produtos/${produtoId}/impressao`, "POST", {
      impressoraId: impId,
      folhas: normalizarNumero(qtd),
      varianteId,
    });
    if (!resultado.ok) {
      setErroMsg(resultado.erro);
      return false;
    }
    startTransition(() => router.refresh());
    return true;
  }

  async function remover(itemId: string) {
    setExcluindo(null);
    const resultado = await enviar(`/api/financeiro/produtos/${produtoId}/impressao/${itemId}`, "DELETE");
    if (!resultado.ok) {
      setErroMsg(resultado.erro);
      return;
    }
    startTransition(() => router.refresh());
  }

  if (impressoras.length === 0) {
    return (
      <p className="text-sm text-muted">
        Cadastre suas impressoras em{" "}
        <Link href="/financeiro/impressoras" className="text-ink underline">
          Impressoras
        </Link>{" "}
        pra incluir o custo de impressão aqui.
      </p>
    );
  }

  const total = itens.reduce((acc, i) => acc + i.folhas * (i.custoFolha ?? 0), 0);

  return (
    <div className="space-y-4">
      {itens.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm [&_td]:pr-4 [&_th]:pr-4">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="pb-2 font-semibold">Impressora</th>
                <th className="pb-2 font-semibold">Folhas</th>
                <th className="pb-2 font-semibold">Custo por folha (frente e verso)</th>
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
                    <td className="py-2.5 text-ink">{item.nome}</td>
                    <td className="py-2.5 tabular-nums">
                      {emEdicao ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          aria-label={`Folhas na ${item.nome}`}
                          value={folhasEdicao}
                          onChange={(e) => setFolhasEdicao(e.target.value)}
                          className={`${campo} w-20 py-1 text-xs`}
                        />
                      ) : (
                        formatarQuantidade(item.folhas)
                      )}
                    </td>
                    <td className="py-2.5 tabular-nums">
                      {item.custoFolha === null ? (
                        <Link href="/financeiro/impressoras" className="text-xs text-alerta underline">
                          falta o volume de páginas
                        </Link>
                      ) : (
                        <span className="text-muted">{formatarReais(item.custoFolha, 4)}</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right font-semibold tabular-nums">
                      {formatarReais(item.folhas * (item.custoFolha ?? 0))}
                    </td>
                    <td className="py-1.5 text-right">
                      {emEdicao ? (
                        <div className="flex justify-end gap-2 whitespace-nowrap">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={async () => {
                              if (await salvar(item.impressoraId, folhasEdicao)) setEditando(null);
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
                          <span className="text-xs font-semibold text-alerta">Tirar?</span>
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
                              setFolhasEdicao(paraCampo(item.folhas));
                            }}
                            aria-label={`Editar folhas na ${item.nome}`}
                            title="Editar folhas"
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
                            aria-label={`Tirar impressão na ${item.nome}`}
                            title="Tirar"
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
                  Impressão
                </td>
                <td className="pt-2.5 text-right font-bold tabular-nums text-ink">{formatarReais(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (await salvar(impressoraId, folhas)) setFolhas("");
        }}
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-dashed border-border p-4"
      >
        <div>
          <label htmlFor={`${id}-impressora`} className={rotulo}>
            Impressora
          </label>
          <select
            id={`${id}-impressora`}
            value={impressoraId}
            onChange={(e) => setImpressoraId(e.target.value)}
            className={campo}
          >
            {impressoras.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-folhas`} className={rotulo}>
            Folhas por unidade (frente e verso)
          </label>
          <input
            id={`${id}-folhas`}
            type="text"
            inputMode="decimal"
            placeholder="40"
            value={folhas}
            onChange={(e) => setFolhas(e.target.value)}
            className={`${campo} w-24`}
          />
        </div>
        <button type="submit" disabled={isPending} className={botaoPrimario}>
          Adicionar
        </button>
        {erroMsg && <p className="w-full text-xs text-alerta">{erroMsg}</p>}
      </form>
    </div>
  );
}
