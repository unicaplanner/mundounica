"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { formatarQuantidade, formatarReais } from "@/lib/financeiro/formato";
import { UNIDADES } from "@/lib/financeiro/unidades";
import { IconeLapis, IconeLixeira, botaoIcone } from "./Icones";
import { botaoPrimario, botaoSecundario, campo } from "./estilos";

export type MaterialLinha = {
  id: string;
  nome: string;
  unidade: string;
  custoAtual: number;
  totalComprado: number;
  usos: number;
  envios: number;
  linkCompra: string | null;
};

function textoUsos(produtos: number, envios: number) {
  const partes = [
    produtos > 0 && `${produtos} ${produtos === 1 ? "produto" : "produtos"}`,
    envios > 0 && `${envios} ${envios === 1 ? "embalagem de envio" : "embalagens de envio"}`,
  ].filter(Boolean);
  return partes.length ? partes.join(" · ") : "—";
}

export function MateriaisTabela({ materiais }: { materiais: MaterialLinha[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editando, setEditando] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [unidade, setUnidade] = useState("");
  const [link, setLink] = useState("");
  const [erro, setErro] = useState<{ id: string; texto: string } | null>(null);

  function abrirEdicao(m: MaterialLinha) {
    setErro(null);
    setExcluindo(null);
    setEditando(m.id);
    setNome(m.nome);
    setUnidade(m.unidade);
    setLink(m.linkCompra ?? "");
  }

  async function salvar(id: string) {
    setErro(null);
    const resultado = await enviar(`/api/financeiro/materiais/${id}`, "PATCH", { nome, unidade, linkCompra: link });
    if (!resultado.ok) {
      setErro({ id, texto: resultado.erro });
      return;
    }
    setEditando(null);
    startTransition(() => router.refresh());
  }

  async function excluir(id: string) {
    setErro(null);
    const resultado = await enviar(`/api/financeiro/materiais/${id}`, "DELETE");
    setExcluindo(null);
    if (!resultado.ok) {
      setErro({ id, texto: resultado.erro });
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm [&_td]:pr-4 [&_th]:pr-4">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th className="py-2 font-semibold">Material</th>
            <th className="py-2 font-semibold">Unidade</th>
            <th className="py-2 font-semibold">Custo atual</th>
            <th className="py-2 font-semibold">Total já comprado</th>
            <th className="py-2 font-semibold">Usado em</th>
            <th className="py-2">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {materiais.map((m) => {
            const emEdicao = editando === m.id;
            const confirmando = excluindo === m.id;
            return (
              <tr
                key={m.id}
                className={`border-b border-border ${emEdicao ? "bg-accent-soft/60" : ""} ${confirmando ? "bg-alerta-soft" : ""}`}
              >
                <td className="py-2.5 pr-2">
                  {emEdicao ? (
                    <div className="space-y-1">
                      <input
                        type="text"
                        aria-label="Nome do material"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className={`${campo} w-52 py-1 text-xs`}
                      />
                      <input
                        type="url"
                        aria-label="Link de compra"
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        placeholder="Link de compra (opcional)"
                        className={`${campo} block w-52 py-1 text-xs`}
                      />
                    </div>
                  ) : (
                    <>
                      <span className="font-semibold text-ink">{m.nome}</span>
                      {m.linkCompra && (
                        <a
                          href={m.linkCompra}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-xs text-muted underline hover:text-ink"
                        >
                          comprar ↗
                        </a>
                      )}
                    </>
                  )}
                </td>
                <td className="py-2.5 pr-2 text-muted">
                  {emEdicao ? (
                    <select
                      aria-label="Unidade"
                      value={unidade}
                      onChange={(e) => setUnidade(e.target.value)}
                      className={`${campo} py-1 text-xs`}
                    >
                      {UNIDADES.map((u) => (
                        <option key={u.valor} value={u.valor}>
                          {u.rotulo}
                        </option>
                      ))}
                    </select>
                  ) : (
                    m.unidade
                  )}
                </td>
                <td className="py-2.5 tabular-nums">
                  {m.custoAtual === 0 ? (
                    <span className="text-xs text-alerta">sem compra registrada</span>
                  ) : (
                    `${formatarReais(m.custoAtual, 4)} / ${m.unidade}`
                  )}
                </td>
                <td className="py-2.5 tabular-nums text-muted">
                  {formatarQuantidade(m.totalComprado)} {m.unidade}
                </td>
                <td className="py-2.5 text-muted">
                  {textoUsos(m.usos, m.envios)}
                </td>
                <td className="py-1.5 text-right">
                  {emEdicao ? (
                    <div className="flex justify-end gap-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => salvar(m.id)}
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
                      <span className="text-xs font-semibold text-alerta">Excluir este material?</span>
                      <button
                        type="button"
                        onClick={() => excluir(m.id)}
                        disabled={isPending}
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
                        onClick={() => abrirEdicao(m)}
                        aria-label={`Editar ${m.nome}`}
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
                          setExcluindo(m.id);
                        }}
                        aria-label={`Excluir ${m.nome}`}
                        title="Excluir"
                        className={botaoIcone}
                      >
                        <IconeLixeira />
                      </button>
                    </div>
                  )}
                  {erro?.id === m.id && <p className="mt-1 max-w-xs text-left text-xs text-alerta">{erro.texto}</p>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
