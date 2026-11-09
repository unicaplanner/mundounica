"use client";

import { useState } from "react";
import { botaoPrimario, botaoSecundario, campo, rotulo } from "@/components/financeiro/estilos";
import {
  CATEGORIAS,
  ORDEM_STATUS,
  ROTULO_STATUS,
  TAGS,
  categoria as acharCategoria,
  type ItemChecklist,
  type StatusTarefa,
  type TarefaUnificada,
} from "@/lib/tarefas/meta";
import { TagChip } from "./Chips";
import type { Acoes } from "./useAcoes";

const CENTRAL_PRODUCAO_URL = process.env.NEXT_PUBLIC_CENTRAL_PRODUCAO_URL;

const SUGESTOES_LINK = [
  { href: "/marketing/tarefas", rotulo: "Marketing · Minhas tarefas" },
  { href: "/marketing/calendario", rotulo: "Marketing · Calendário" },
  { href: "/marketing/parcerias", rotulo: "Parcerias" },
  { href: "/marketing/parcerias/triagem", rotulo: "Parcerias · Triagem" },
  { href: "/financeiro", rotulo: "Financeiro" },
  { href: "/financeiro/caixa", rotulo: "Financeiro · Caixa" },
  ...(CENTRAL_PRODUCAO_URL ? [{ href: CENTRAL_PRODUCAO_URL, rotulo: "Central de Produção" }] : []),
];

function linkDaCategoria(valor: string) {
  return valor === "producao" ? CENTRAL_PRODUCAO_URL : acharCategoria(valor).href;
}

// Criar/editar tarefa manual. `tarefa` nula = nova (com prazo inicial
// opcional, ex: o dia clicado no calendario).
export function Formulario({
  tarefa,
  prazoInicial,
  acoes,
  fechar,
}: {
  tarefa: TarefaUnificada | null;
  prazoInicial: string | null;
  acoes: Acoes;
  fechar: () => void;
}) {
  const [titulo, setTitulo] = useState(tarefa?.titulo ?? "");
  const [descricao, setDescricao] = useState(tarefa?.descricao ?? "");
  const [cat, setCat] = useState(tarefa?.categoria ?? "geral");
  const [tags, setTags] = useState<string[]>(tarefa?.tags ?? []);
  const [status, setStatus] = useState<StatusTarefa>(tarefa?.status ?? "a_fazer");
  const [prazo, setPrazo] = useState(tarefa?.prazo ?? prazoInicial ?? "");
  const [link, setLink] = useState(tarefa?.link?.href ?? "");
  const [itens, setItens] = useState<ItemChecklist[]>(tarefa?.checklist ?? []);
  const [novoItem, setNovoItem] = useState("");
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  const chave = tarefa?.id ?? "nova";
  const ocupado = acoes.ocupados.has(chave);
  const sugestao = linkDaCategoria(cat);

  function addItem() {
    const texto = novoItem.trim();
    if (!texto) return;
    setItens((l) => [...l, { texto, feito: false }]);
    setNovoItem("");
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const dados = {
      titulo,
      descricao: descricao || null,
      categoria: cat,
      tags,
      status,
      prazo: prazo || null,
      link: link || null,
      checklist: novoItem.trim() ? [...itens, { texto: novoItem.trim(), feito: false }] : itens,
    };
    const ok = tarefa?.manualId ? await acoes.atualizar(tarefa.id, tarefa.manualId, dados) : await acoes.criar(dados);
    if (ok) fechar();
  }

  async function excluir() {
    if (tarefa?.manualId && (await acoes.excluir(tarefa.id, tarefa.manualId))) fechar();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex animate-brotar items-end justify-center bg-ink/30 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && fechar()}
    >
      <form
        onSubmit={salvar}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-card p-5 shadow-xl sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-ink">{tarefa ? "Editar tarefa" : "Nova tarefa"}</h2>
          <button type="button" onClick={fechar} className="text-muted hover:text-ink" aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className={rotulo} htmlFor="tarefa-titulo">
              Título
            </label>
            <input
              id="tarefa-titulo"
              autoFocus
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Aprovar a arte da capa nova"
              className={`${campo} w-full`}
            />
          </div>

          <div>
            <label className={rotulo} htmlFor="tarefa-descricao">
              Detalhes
            </label>
            <textarea
              id="tarefa-descricao"
              rows={2}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className={`${campo} w-full`}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className={rotulo} htmlFor="tarefa-categoria">
                Categoria
              </label>
              <select id="tarefa-categoria" value={cat} onChange={(e) => setCat(e.target.value)} className={`${campo} w-full`}>
                {CATEGORIAS.map((c) => (
                  <option key={c.valor} value={c.valor}>
                    {c.rotulo}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={rotulo} htmlFor="tarefa-prazo">
                Prazo
              </label>
              <input id="tarefa-prazo" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} className={`${campo} w-full`} />
            </div>
            <div>
              <label className={rotulo} htmlFor="tarefa-status">
                Status
              </label>
              <select
                id="tarefa-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusTarefa)}
                className={`${campo} w-full`}
              >
                {ORDEM_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {ROTULO_STATUS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <span className={rotulo}>Tags</span>
            <div className="flex flex-wrap gap-1.5">
              {TAGS.map((t) => (
                <button
                  key={t.valor}
                  type="button"
                  aria-pressed={tags.includes(t.valor)}
                  onClick={() => setTags((l) => (l.includes(t.valor) ? l.filter((x) => x !== t.valor) : [...l, t.valor]))}
                >
                  <TagChip valor={t.valor} ativa={tags.includes(t.valor)} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={rotulo} htmlFor="tarefa-link">
              Link pra mais detalhes
            </label>
            <input
              id="tarefa-link"
              list="tarefa-link-sugestoes"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="/financeiro/... ou https://..."
              className={`${campo} w-full`}
            />
            <datalist id="tarefa-link-sugestoes">
              {SUGESTOES_LINK.map((s) => (
                <option key={s.href} value={s.href}>
                  {s.rotulo}
                </option>
              ))}
            </datalist>
            {!link && sugestao && (
              <button type="button" onClick={() => setLink(sugestao)} className="mt-1 text-xs text-muted underline">
                Usar o módulo da categoria
              </button>
            )}
          </div>

          <div>
            <span className={rotulo}>Checklist</span>
            {itens.length > 0 && (
              <ul className="mb-2 flex flex-col gap-1">
                {itens.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={item.feito}
                      onChange={() => setItens((l) => l.map((x, j) => (j === i ? { ...x, feito: !x.feito } : x)))}
                      className="h-4 w-4 accent-[var(--ink)]"
                    />
                    <span className={`flex-1 ${item.feito ? "text-muted line-through" : "text-ink"}`}>{item.texto}</span>
                    <button
                      type="button"
                      onClick={() => setItens((l) => l.filter((_, j) => j !== i))}
                      className="text-xs text-muted hover:text-alerta"
                    >
                      remover
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <input
                value={novoItem}
                onChange={(e) => setNovoItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addItem();
                  }
                }}
                placeholder="Adicionar sub-item"
                aria-label="Novo sub-item"
                className={`${campo} flex-1`}
              />
              <button type="button" onClick={addItem} className={botaoSecundario}>
                Adicionar
              </button>
            </div>
          </div>
        </div>

        {acoes.mensagem && <p className="mt-4 text-xs text-alerta">{acoes.mensagem}</p>}

        <div className="mt-5 flex items-center justify-between gap-3">
          {tarefa?.manualId ? (
            confirmarExclusao ? (
              <span className="flex items-center gap-2 text-xs">
                <span className="text-muted">Excluir de vez?</span>
                <button type="button" onClick={excluir} className="font-semibold text-alerta underline">
                  Sim, excluir
                </button>
                <button type="button" onClick={() => setConfirmarExclusao(false)} className="text-muted">
                  Cancelar
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmarExclusao(true)} className="text-xs text-muted hover:text-alerta">
                Excluir tarefa
              </button>
            )
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={fechar} className={botaoSecundario}>
              Cancelar
            </button>
            <button type="submit" disabled={ocupado || !titulo.trim()} className={botaoPrimario}>
              {ocupado ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
