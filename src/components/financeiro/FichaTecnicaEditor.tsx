"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { formatarQuantidade, formatarReais, normalizarNumero, paraCampo } from "@/lib/financeiro/formato";
import { UNIDADES } from "@/lib/financeiro/unidades";
import { IconeLapis, IconeLixeira, botaoIcone } from "./Icones";
import { botaoPrimario, botaoSecundario, campo, rotulo } from "./estilos";

type Material = { id: string; nome: string; unidade: string; custoAtual: number };
type Item = { id: string; quantidade: number; material: Material };

const NOVO = "__novo__";

export function FichaTecnicaEditor({
  produtoId,
  itens,
  materiais,
}: {
  produtoId: string;
  itens: Item[];
  materiais: Material[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [materialId, setMaterialId] = useState(materiais[0]?.id ?? NOVO);
  const [quantidade, setQuantidade] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [novaUnidade, setNovaUnidade] = useState("folha");
  const [erroMsg, setErroMsg] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [editandoItem, setEditandoItem] = useState<string | null>(null);
  const [qtdEdicao, setQtdEdicao] = useState("");
  const [excluindoItem, setExcluindoItem] = useState<string | null>(null);

  const criandoMaterial = materialId === NOVO;
  const unidade = criandoMaterial ? novaUnidade : materiais.find((m) => m.id === materialId)?.unidade;

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    setErroMsg(null);
    setEnviando(true);

    let idParaAdicionar = materialId;
    if (criandoMaterial) {
      const criado = await enviar("/api/financeiro/materiais", "POST", { nome: novoNome, unidade: novaUnidade });
      if (!criado.ok) {
        setErroMsg(criado.erro);
        setEnviando(false);
        return;
      }
      idParaAdicionar = String(criado.dados.id);
    }

    const resultado = await enviar(`/api/financeiro/produtos/${produtoId}/ficha`, "POST", {
      materialId: idParaAdicionar,
      quantidade: normalizarNumero(quantidade),
    });
    setEnviando(false);
    if (!resultado.ok) {
      setErroMsg(resultado.erro);
      return;
    }

    setQuantidade("");
    setNovoNome("");
    setMaterialId(idParaAdicionar);
    startTransition(() => router.refresh());
  }

  async function remover(itemId: string) {
    setExcluindoItem(null);
    const resultado = await enviar(`/api/financeiro/produtos/${produtoId}/ficha/${itemId}`, "DELETE");
    if (!resultado.ok) {
      setErroMsg(resultado.erro);
      return;
    }
    startTransition(() => router.refresh());
  }

  async function salvarQuantidade(item: Item) {
    setErroMsg(null);
    const resultado = await enviar(`/api/financeiro/produtos/${produtoId}/ficha`, "POST", {
      materialId: item.material.id,
      quantidade: normalizarNumero(qtdEdicao),
    });
    if (!resultado.ok) {
      setErroMsg(resultado.erro);
      return;
    }
    setEditandoItem(null);
    startTransition(() => router.refresh());
  }

  const total = itens.reduce((acc, item) => acc + item.quantidade * item.material.custoAtual, 0);

  return (
    <div className="space-y-6">
      {itens.length === 0 ? (
        <p className="text-sm text-muted">
          Nenhum material ainda. Adicione abaixo tudo que vai em uma unidade do produto: papel, capa,
          embalagem, etc.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm [&_td]:pr-4 [&_th]:pr-4">
            <thead>
              <tr className="text-left text-xs font-semibold text-muted">
                <th className="pb-2 font-semibold">Material</th>
                <th className="pb-2 font-semibold">Quantidade</th>
                <th className="pb-2 font-semibold">Custo unitário</th>
                <th className="pb-2 text-right font-semibold">Subtotal</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => {
                const semCompra = item.material.custoAtual === 0;
                const emEdicao = editandoItem === item.id;
                const confirmando = excluindoItem === item.id;
                return (
                  <tr
                    key={item.id}
                    className={`border-t border-border ${emEdicao ? "bg-accent-soft/60" : ""} ${confirmando ? "bg-alerta-soft" : ""}`}
                  >
                    <td className="py-2.5 text-ink">{item.material.nome}</td>
                    <td className="py-2.5 tabular-nums">
                      {emEdicao ? (
                        <span className="flex items-center gap-1">
                          <input
                            type="text"
                            inputMode="decimal"
                            aria-label={`Quantidade de ${item.material.nome}`}
                            value={qtdEdicao}
                            onChange={(e) => setQtdEdicao(e.target.value)}
                            className={`${campo} w-20 py-1 text-xs`}
                          />
                          <span className="text-xs text-muted">{item.material.unidade}</span>
                        </span>
                      ) : (
                        <>
                          {formatarQuantidade(item.quantidade)} {item.material.unidade}
                        </>
                      )}
                    </td>
                    <td className="py-2.5 tabular-nums">
                      {semCompra ? (
                        <Link href="/financeiro/compras" className="text-xs text-alerta underline">
                          sem compra registrada
                        </Link>
                      ) : (
                        <span className="text-muted">{formatarReais(item.material.custoAtual, 4)}</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right font-semibold tabular-nums">
                      {formatarReais(item.quantidade * item.material.custoAtual)}
                    </td>
                    <td className="py-1.5 pl-3 text-right">
                      {emEdicao ? (
                        <div className="flex justify-end gap-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => salvarQuantidade(item)}
                            disabled={isPending}
                            className={`${botaoPrimario} px-3 py-1 text-xs`}
                          >
                            Salvar
                          </button>
                          <button type="button" onClick={() => setEditandoItem(null)} className={botaoSecundario}>
                            Cancelar
                          </button>
                        </div>
                      ) : confirmando ? (
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          <span className="text-xs font-semibold text-alerta">Tirar da ficha?</span>
                          <button
                            type="button"
                            onClick={() => remover(item.id)}
                            disabled={isPending}
                            className="rounded-full bg-alerta px-3 py-1 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                          >
                            Tirar
                          </button>
                          <button type="button" onClick={() => setExcluindoItem(null)} className={botaoSecundario}>
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setExcluindoItem(null);
                              setEditandoItem(item.id);
                              setQtdEdicao(paraCampo(item.quantidade));
                            }}
                            aria-label={`Editar quantidade de ${item.material.nome}`}
                            title="Editar quantidade"
                            className={botaoIcone}
                          >
                            <IconeLapis />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditandoItem(null);
                              setExcluindoItem(item.id);
                            }}
                            aria-label={`Tirar ${item.material.nome} da ficha`}
                            title="Tirar da ficha"
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
                  Custo de uma unidade
                </td>
                <td className="pt-2.5 text-right font-bold tabular-nums text-ink">{formatarReais(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <form onSubmit={adicionar} className="space-y-3 rounded-2xl border border-dashed border-border p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Adicionar material</p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="ficha-material" className={rotulo}>
              Material
            </label>
            <select
              id="ficha-material"
              value={materialId}
              onChange={(e) => setMaterialId(e.target.value)}
              className={campo}
            >
              {materiais.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome} ({m.unidade})
                </option>
              ))}
              <option value={NOVO}>+ Cadastrar material novo</option>
            </select>
          </div>

          {criandoMaterial && (
            <>
              <div>
                <label htmlFor="ficha-novo-nome" className={rotulo}>
                  Nome do material novo
                </label>
                <input
                  id="ficha-novo-nome"
                  type="text"
                  placeholder="Papel offset 90g"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  className={`${campo} w-48`}
                />
              </div>
              <div>
                <label htmlFor="ficha-nova-unidade" className={rotulo}>
                  Unidade
                </label>
                <select
                  id="ficha-nova-unidade"
                  value={novaUnidade}
                  onChange={(e) => setNovaUnidade(e.target.value)}
                  className={campo}
                >
                  {UNIDADES.map((u) => (
                    <option key={u.valor} value={u.valor}>
                      {u.rotulo}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label htmlFor="ficha-quantidade" className={rotulo}>
              Quantidade por unidade{unidade ? ` (${unidade})` : ""}
            </label>
            <input
              id="ficha-quantidade"
              type="text"
              inputMode="decimal"
              placeholder="40"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              className={`${campo} w-28`}
            />
          </div>

          <button type="submit" disabled={enviando || isPending} className={botaoPrimario}>
            {criandoMaterial ? "Criar e adicionar" : "Adicionar"}
          </button>
        </div>
        {erroMsg && <p className="text-xs text-alerta">{erroMsg}</p>}
      </form>
    </div>
  );
}
