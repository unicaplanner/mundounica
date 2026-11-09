"use client";

import { useMemo, useState } from "react";
import { botaoPrimario, botaoSecundario, campo } from "@/components/financeiro/estilos";
import { normalizarBusca } from "@/lib/financeiro/formato";
import { CATEGORIAS, TAGS, type StatusTarefa, type TarefaUnificada } from "@/lib/tarefas/meta";
import { TagChip } from "./Chips";
import { Formulario } from "./Formulario";
import type { Ctx } from "./Item";
import { useAcoes } from "./useAcoes";
import { Calendario, Hoje, Kanban, ListaCompleta } from "./Visoes";

export type Visao = "hoje" | "lista" | "kanban" | "calendario";

const VISOES: { valor: Visao; rotulo: string }[] = [
  { valor: "hoje", rotulo: "Hoje" },
  { valor: "lista", rotulo: "Lista" },
  { valor: "kanban", rotulo: "Kanban" },
  { valor: "calendario", rotulo: "Calendário" },
];

type Origem = "todas" | "manual" | "auto";

export function Organizador({ tarefas, hoje, visaoInicial }: { tarefas: TarefaUnificada[]; hoje: string; visaoInicial: Visao }) {
  const acoes = useAcoes();
  const [visao, setVisao] = useState<Visao>(visaoInicial);
  const [busca, setBusca] = useState("");
  const [cat, setCat] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [origem, setOrigem] = useState<Origem>("todas");
  const [rapida, setRapida] = useState("");
  // undefined = fechado; null = nova
  const [editando, setEditando] = useState<TarefaUnificada | null | undefined>(undefined);
  const [prazoNova, setPrazoNova] = useState<string | null>(null);

  // Status trocado na tela antes do servidor responder. Vale so enquanto
  // `tarefas` for o mesmo array: o refresh traz o dado de verdade.
  const [otimista, setOtimista] = useState<{ base: TarefaUnificada[]; status: Record<string, StatusTarefa> }>({
    base: tarefas,
    status: {},
  });
  const trocas = otimista.base === tarefas ? otimista.status : null;
  const efetivas = useMemo(
    () =>
      trocas
        ? tarefas.map((t) => (trocas[t.id] ? { ...t, status: trocas[t.id], concluidaEm: trocas[t.id] === "concluido" ? hoje : null } : t))
        : tarefas,
    [tarefas, trocas, hoje]
  );

  function marcar(id: string, status: StatusTarefa | null) {
    setOtimista((o) => {
      const atual = o.base === tarefas ? { ...o.status } : {};
      if (status) atual[id] = status;
      else delete atual[id];
      return { base: tarefas, status: atual };
    });
  }

  async function mudarStatus(t: TarefaUnificada, status: StatusTarefa) {
    marcar(t.id, status);
    const ok =
      t.origem === "manual"
        ? await acoes.atualizar(t.id, t.manualId!, { status })
        : t.concluir && status === "concluido"
          ? await acoes.chamar(t.id, t.concluir)
          : false;
    if (!ok) marcar(t.id, null);
  }

  const ctx: Ctx = {
    hoje,
    acoes,
    editar: (t) => {
      acoes.limparMensagem();
      setEditando(t);
    },
    alternar: (t) => mudarStatus(t, t.status === "concluido" ? "a_fazer" : "concluido"),
    mover: (t, status) => mudarStatus(t, status),
    nova: (prazo) => {
      acoes.limparMensagem();
      setPrazoNova(prazo);
      setEditando(null);
    },
  };

  // Troca de visao sem ir ao servidor; o ?visao= fica na URL pra voltar direto.
  function trocarVisao(v: Visao) {
    setVisao(v);
    window.history.replaceState(null, "", v === "hoje" ? window.location.pathname : `?visao=${v}`);
  }

  const filtradas = useMemo(() => {
    const termo = normalizarBusca(busca.trim());
    return efetivas.filter(
      (t) =>
        (!cat || t.categoria === cat) &&
        (origem === "todas" || t.origem === origem) &&
        (!tags.length || tags.some((v) => t.tags.includes(v))) &&
        (!termo || normalizarBusca(`${t.titulo} ${t.descricao ?? ""}`).includes(termo))
    );
  }, [efetivas, busca, cat, origem, tags]);

  const temFiltro = !!busca || !!cat || tags.length > 0 || origem !== "todas";

  async function adicionarRapida(e: React.FormEvent) {
    e.preventDefault();
    const titulo = rapida.trim();
    if (!titulo) return;
    if (await acoes.criar({ titulo, categoria: cat || "geral", tags, prazo: visao === "hoje" ? hoje : null })) setRapida("");
  }

  const props = { tarefas: filtradas, ctx };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-full bg-accent-soft p-1">
          {VISOES.map((v) => (
            <button
              key={v.valor}
              type="button"
              onClick={() => trocarVisao(v.valor)}
              aria-current={visao === v.valor ? "page" : undefined}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                visao === v.valor ? "bg-ink text-background" : "text-ink/70 hover:text-ink"
              }`}
            >
              {v.rotulo}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => ctx.nova(visao === "hoje" ? hoje : null)} className={botaoPrimario}>
          + Nova tarefa
        </button>
      </div>

      <div className="flex flex-col gap-2.5 rounded-2xl border border-border-soft bg-accent-soft/40 p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar tarefa, criadora, material..."
            aria-label="Buscar"
            className={`${campo} flex-1`}
          />
          <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filtrar por categoria" className={campo}>
            <option value="">Todas as categorias</option>
            {CATEGORIAS.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.rotulo}
              </option>
            ))}
          </select>
          <select value={origem} onChange={(e) => setOrigem(e.target.value as Origem)} aria-label="Filtrar por origem" className={campo}>
            <option value="todas">Minhas e automáticas</option>
            <option value="manual">Só as minhas</option>
            <option value="auto">Só as dos módulos</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-muted">Tags:</span>
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
          {temFiltro && (
            <button
              type="button"
              onClick={() => {
                setBusca("");
                setCat("");
                setTags([]);
                setOrigem("todas");
              }}
              className="ml-auto text-[11px] text-muted underline"
            >
              Limpar filtros ({filtradas.length} de {efetivas.length})
            </button>
          )}
        </div>
      </div>

      {(visao === "hoje" || visao === "lista") && (
        <form onSubmit={adicionarRapida} className="flex gap-2">
          <input
            value={rapida}
            onChange={(e) => setRapida(e.target.value)}
            placeholder={visao === "hoje" ? "Anotar uma tarefa pra hoje e apertar Enter..." : "Anotar uma tarefa e apertar Enter..."}
            aria-label="Nova tarefa rápida"
            className={`${campo} flex-1 border-dashed`}
          />
          <button type="submit" disabled={!rapida.trim() || acoes.ocupados.has("nova")} className={botaoSecundario}>
            Adicionar
          </button>
        </form>
      )}

      {acoes.mensagem && editando === undefined && <p className="text-xs text-alerta">{acoes.mensagem}</p>}

      {visao === "hoje" && <Hoje {...props} />}
      {visao === "lista" && <ListaCompleta {...props} />}
      {visao === "kanban" && <Kanban {...props} />}
      {visao === "calendario" && <Calendario {...props} />}

      {editando !== undefined && (
        <Formulario
          key={editando?.id ?? "nova"}
          tarefa={editando}
          prazoInicial={prazoNova}
          acoes={acoes}
          fechar={() => setEditando(undefined)}
        />
      )}
    </div>
  );
}
