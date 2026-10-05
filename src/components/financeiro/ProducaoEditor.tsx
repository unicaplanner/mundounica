"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { formatarQuantidade, formatarReais, normalizarNumero, paraCampo } from "@/lib/financeiro/formato";
import { UNIDADES } from "@/lib/financeiro/unidades";
import { IconeLapis, IconeLixeira, botaoIcone } from "./Icones";
import { botaoPrimario, botaoSecundario, campo, rotulo } from "./estilos";

type Material = { id: string; nome: string; unidade: string; custoAtual: number; impresso: boolean };
export type ItemFicha = { id: string; quantidade: number; material: Material };
// Tempo de trabalho manual (minutos por unidade ou pedido) x valor da hora.
export type MaoDeObra = { minutos: number | null; valorHora: number | null; url: string; campo: string };

const NOVO = "__novo__";

// O que vai pra produzir uma unidade (ou montar um pedido). Material marcado
// como impresso (o papel) ja traz a impressao frente e verso na mesma
// quantidade, com o custo da impressora mais cara -- nao se lanca impressao
// separada. varianteId nulo = composicao do produto inteiro. Pode aparecer
// varias vezes na mesma pagina (uma por variante), por isso os ids vem de useId.
export function ProducaoEditor({
  produtoId,
  baseUrl,
  por = "unidade",
  varianteId = null,
  itens,
  materiais,
  custoFolha,
  impressora,
  maoDeObra,
  textoVazio = "Nada cadastrado ainda. Adicione o papel, a capa e o saquinho de uma unidade.",
  rotuloTotal = "Custo pra produzir uma unidade",
}: {
  produtoId?: string;
  // de onde gravar; padrao = composicao do produto (a embalagem de envio usa outra rota)
  baseUrl?: string;
  por?: string; // "unidade" (produto) ou "pedido" (embalagem de envio)
  varianteId?: string | null;
  itens: ItemFicha[];
  materiais: Material[];
  custoFolha: number | null; // impressao de uma folha frente e verso
  impressora: string | null;
  maoDeObra?: MaoDeObra;
  textoVazio?: string;
  rotuloTotal?: string;
}) {
  const id = useId();
  const base = baseUrl ?? `/api/financeiro/produtos/${produtoId}`;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [abrir, setAbrir] = useState(false);
  const [materialId, setMaterialId] = useState(materiais[0]?.id ?? NOVO);
  const [quantidade, setQuantidade] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [novaUnidade, setNovaUnidade] = useState("folha");
  const [novoImpresso, setNovoImpresso] = useState(true);
  const [erroMsg, setErroMsg] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [qtdEdicao, setQtdEdicao] = useState("");
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [editandoTempo, setEditandoTempo] = useState(false);
  const [tempo, setTempo] = useState("");

  const criandoMaterial = materialId === NOVO;
  const unidade = criandoMaterial ? novaUnidade : materiais.find((m) => m.id === materialId)?.unidade;
  const atualizar = () => startTransition(() => router.refresh());

  const gravar = (matId: string, qtd: string) =>
    enviar(`${base}/ficha`, "POST", { materialId: matId, quantidade: normalizarNumero(qtd), varianteId });

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    setErroMsg(null);
    setEnviando(true);
    let idParaAdicionar = materialId;
    if (criandoMaterial) {
      const criado = await enviar("/api/financeiro/materiais", "POST", {
        nome: novoNome,
        unidade: novaUnidade,
        impresso: novaUnidade === "folha" && novoImpresso,
      });
      if (!criado.ok) {
        setErroMsg(criado.erro);
        setEnviando(false);
        return;
      }
      idParaAdicionar = String(criado.dados.id);
    }
    const resultado = await gravar(idParaAdicionar, quantidade);
    setEnviando(false);
    if (!resultado.ok) {
      setErroMsg(resultado.erro);
      return;
    }
    setQuantidade("");
    setNovoNome("");
    setMaterialId(idParaAdicionar);
    setAbrir(false);
    atualizar();
  }

  async function salvarEdicao(item: ItemFicha) {
    setErroMsg(null);
    const resultado = await gravar(item.material.id, qtdEdicao);
    if (!resultado.ok) {
      setErroMsg(resultado.erro);
      return;
    }
    setEditando(null);
    atualizar();
  }

  async function salvarTempo() {
    if (!maoDeObra) return;
    setErroMsg(null);
    const resultado = await enviar(maoDeObra.url, "PATCH", { [maoDeObra.campo]: normalizarNumero(tempo) });
    if (!resultado.ok) {
      setErroMsg(resultado.erro);
      return;
    }
    setEditandoTempo(false);
    atualizar();
  }

  async function remover(itemId: string) {
    setExcluindo(null);
    setErroMsg(null);
    const resultado = await enviar(`${base}/ficha/${itemId}`, "DELETE");
    if (!resultado.ok) {
      setErroMsg(resultado.erro);
      return;
    }
    atualizar();
  }

  const custoUnidade = (m: Material) => m.custoAtual + (m.impresso ? (custoFolha ?? 0) : 0);
  const custoMaoDeObra =
    maoDeObra?.minutos && maoDeObra.valorHora ? (maoDeObra.minutos / 60) * maoDeObra.valorHora : 0;
  const total = itens.reduce((acc, item) => acc + item.quantidade * custoUnidade(item.material), 0) + custoMaoDeObra;
  const temImpresso = itens.some((i) => i.material.impresso);

  return (
    <div className="space-y-3">
      {itens.length === 0 && !maoDeObra ? (
        <p className="text-sm text-muted">{textoVazio}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm [&_td]:pr-4 [&_th]:pr-4">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="pb-2 font-semibold">Item</th>
                <th className="pb-2 font-semibold">Quantidade</th>
                <th className="pb-2 font-semibold">Custo unitário</th>
                <th className="pb-2 text-right font-semibold">Subtotal</th>
                <th className="pb-2">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {itens.length === 0 && (
                <tr className="border-t border-border">
                  <td colSpan={5} className="py-2.5 text-sm text-muted">
                    {textoVazio}
                  </td>
                </tr>
              )}
              {itens.map((item) => {
                const m = item.material;
                const emEdicao = editando === item.id;
                const confirmando = excluindo === item.id;
                return (
                  <tr
                    key={item.id}
                    className={`border-t border-border ${emEdicao ? "bg-accent-soft/60" : ""} ${confirmando ? "bg-alerta-soft" : ""}`}
                  >
                    <td className="py-2.5 text-ink">
                      {m.nome}
                      {m.impresso && <span className="block text-xs text-muted">+ impressão frente e verso</span>}
                    </td>
                    <td className="py-2.5 tabular-nums">
                      {emEdicao ? (
                        <span className="flex items-center gap-1">
                          <input
                            type="text"
                            inputMode="decimal"
                            aria-label={`Quantidade de ${m.nome}`}
                            value={qtdEdicao}
                            onChange={(e) => setQtdEdicao(e.target.value)}
                            className={`${campo} w-20 py-1 text-xs`}
                          />
                          <span className="text-xs text-muted">{m.unidade}</span>
                        </span>
                      ) : (
                        `${formatarQuantidade(item.quantidade)} ${m.unidade}`
                      )}
                    </td>
                    <td className="py-2.5 tabular-nums">
                      {m.custoAtual === 0 ? (
                        <Link href="/financeiro/compras" className="text-xs text-alerta underline">
                          sem compra registrada
                        </Link>
                      ) : (
                        <span className="text-muted">{formatarReais(m.custoAtual, 4)}</span>
                      )}
                      {m.impresso &&
                        (custoFolha === null ? (
                          <Link href="/financeiro/impressoras" className="block text-xs text-alerta underline">
                            falta páginas/ano da impressora
                          </Link>
                        ) : (
                          <span className="block text-xs text-muted">+ {formatarReais(custoFolha, 4)} impressão</span>
                        ))}
                    </td>
                    <td className="py-2.5 text-right font-semibold tabular-nums">
                      {formatarReais(item.quantidade * custoUnidade(m))}
                    </td>
                    <td className="py-1.5 pl-3 text-right">
                      {emEdicao ? (
                        <div className="flex justify-end gap-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => salvarEdicao(item)}
                            disabled={isPending}
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
                              setQtdEdicao(paraCampo(item.quantidade));
                            }}
                            aria-label={`Editar quantidade de ${m.nome}`}
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
                            aria-label={`Tirar ${m.nome}`}
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
              {maoDeObra && (
                <tr className={`border-t border-border ${editandoTempo ? "bg-accent-soft/60" : ""}`}>
                  <td className="py-2.5 text-ink">
                    Mão de obra
                    <span className="block text-xs text-muted">seu tempo de trabalho manual</span>
                  </td>
                  <td className="py-2.5 tabular-nums">
                    {editandoTempo ? (
                      <span className="flex items-center gap-1">
                        <input
                          type="text"
                          inputMode="decimal"
                          aria-label="Minutos de trabalho"
                          value={tempo}
                          onChange={(e) => setTempo(e.target.value)}
                          className={`${campo} w-20 py-1 text-xs`}
                        />
                        <span className="text-xs text-muted">min</span>
                      </span>
                    ) : maoDeObra.minutos ? (
                      `${formatarQuantidade(maoDeObra.minutos)} min`
                    ) : (
                      <span className="text-xs text-alerta">falta o tempo</span>
                    )}
                  </td>
                  <td className="py-2.5 tabular-nums">
                    {maoDeObra.valorHora ? (
                      <span className="text-muted">{formatarReais(maoDeObra.valorHora)}/hora</span>
                    ) : (
                      <Link href="/financeiro/custos" className="text-xs text-alerta underline">
                        defina o valor da hora
                      </Link>
                    )}
                  </td>
                  <td className="py-2.5 text-right font-semibold tabular-nums">
                    {maoDeObra.minutos && maoDeObra.valorHora ? formatarReais(custoMaoDeObra) : "—"}
                  </td>
                  <td className="py-1.5 pl-3 text-right">
                    {editandoTempo ? (
                      <div className="flex justify-end gap-2 whitespace-nowrap">
                        <button type="button" onClick={salvarTempo} disabled={isPending} className={`${botaoPrimario} px-3 py-1 text-xs`}>
                          Salvar
                        </button>
                        <button type="button" onClick={() => setEditandoTempo(false)} className={botaoSecundario}>
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setTempo(maoDeObra.minutos ? paraCampo(maoDeObra.minutos) : "");
                            setEditandoTempo(true);
                          }}
                          aria-label="Editar tempo de trabalho"
                          title="Editar tempo"
                          className={botaoIcone}
                        >
                          <IconeLapis />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-ink/20">
                <td colSpan={3} className="pt-2.5 text-right text-xs font-semibold text-muted">
                  {rotuloTotal}
                </td>
                <td className="pt-2.5 text-right font-bold tabular-nums text-ink">{formatarReais(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
          {temImpresso && custoFolha !== null && (
            <p className="mt-2 text-xs text-muted">
              Impressão: {formatarReais(custoFolha, 4)} por folha frente e verso ({impressora}, a impressora mais cara —
              cobre mesmo quando imprime na outra).
            </p>
          )}
        </div>
      )}

      {!abrir ? (
        <button type="button" onClick={() => setAbrir(true)} className={botaoSecundario}>
          + Adicionar material
        </button>
      ) : (
        <form onSubmit={adicionar} className="flex flex-wrap items-end gap-3 rounded-xl bg-accent-soft/50 p-3">
          <div>
            <label htmlFor={`${id}-material`} className={rotulo}>
              Material
            </label>
            <select id={`${id}-material`} value={materialId} onChange={(e) => setMaterialId(e.target.value)} className={campo}>
              {materiais.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome} ({m.unidade}
                  {m.impresso ? ", impresso" : ""})
                </option>
              ))}
              <option value={NOVO}>+ Cadastrar material novo</option>
            </select>
          </div>
          {criandoMaterial && (
            <>
              <div>
                <label htmlFor={`${id}-novo-nome`} className={rotulo}>
                  Nome do material novo
                </label>
                <input
                  id={`${id}-novo-nome`}
                  type="text"
                  placeholder="Papel A5 120g"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  className={`${campo} w-48`}
                />
              </div>
              <div>
                <label htmlFor={`${id}-nova-unidade`} className={rotulo}>
                  Unidade
                </label>
                <select id={`${id}-nova-unidade`} value={novaUnidade} onChange={(e) => setNovaUnidade(e.target.value)} className={campo}>
                  {UNIDADES.map((u) => (
                    <option key={u.valor} value={u.valor}>
                      {u.rotulo}
                    </option>
                  ))}
                </select>
              </div>
              {novaUnidade === "folha" && (
                <label className="flex items-center gap-2 pb-2 text-xs text-ink/80">
                  <input
                    type="checkbox"
                    checked={novoImpresso}
                    onChange={(e) => setNovoImpresso(e.target.checked)}
                    className="size-4 accent-ink"
                  />
                  É impresso (frente e verso)
                </label>
              )}
            </>
          )}
          <div>
            <label htmlFor={`${id}-quantidade`} className={rotulo}>
              Quantidade por {por}
              {unidade ? ` (${unidade})` : ""}
            </label>
            <input
              id={`${id}-quantidade`}
              type="text"
              inputMode="decimal"
              placeholder="1"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              className={`${campo} w-24`}
            />
          </div>
          <button type="submit" disabled={enviando || isPending} className={botaoPrimario}>
            {criandoMaterial ? "Criar e adicionar" : "Adicionar"}
          </button>
          <button type="button" onClick={() => setAbrir(false)} className={botaoSecundario}>
            Cancelar
          </button>
        </form>
      )}

      {erroMsg && <p className="text-xs text-alerta">{erroMsg}</p>}
    </div>
  );
}
