"use client";

import { useState } from "react";
import { somarDias } from "@/lib/marketing/datas";
import {
  ORDEM_STATUS,
  ROTULO_STATUS,
  aberta,
  atrasada,
  categoria,
  dataLonga,
  diaDaSemana,
  nomeDoMes,
  progressoDe,
  textoPrazo,
  type StatusTarefa,
  type TarefaUnificada,
} from "@/lib/tarefas/meta";
import { Barra, CategoriaChip, TagChip } from "./Chips";
import { AcaoRapida, LinkTarefa, Lista, Marcador, Prazo, Secao, Titulo, Vazio, type Ctx } from "./Item";

type Props = { tarefas: TarefaUnificada[]; ctx: Ctx };

function Concluidas({ tarefas, ctx }: Props) {
  if (!tarefas.length) return null;
  return (
    <details className="group flex flex-col gap-2">
      <summary className="cursor-pointer list-none text-sm font-semibold text-ok">
        <span className="mr-1 inline-block transition group-open:rotate-90">›</span>
        Concluídas <span className="font-normal text-muted">({tarefas.length})</span>
      </summary>
      <div className="mt-2">
        <Lista tarefas={tarefas} ctx={ctx} />
      </div>
    </details>
  );
}

function Numero({ rotulo, valor, cor }: { rotulo: string; valor: number; cor: string }) {
  return (
    <div className={`rounded-xl px-4 py-3 ${cor}`}>
      <p className="text-[11px] font-semibold tracking-wide uppercase">{rotulo}</p>
      <p className="font-serif text-2xl font-semibold tabular-nums">{valor}</p>
    </div>
  );
}

// ---------- Hoje ----------

export function Hoje({ tarefas, ctx }: Props) {
  const { hoje } = ctx;
  const abertas = tarefas.filter(aberta);
  const atrasadas = abertas.filter((t) => atrasada(t, hoje));
  const deHoje = abertas.filter((t) => t.prazo === hoje);
  const jaListadas = new Set([...atrasadas, ...deHoje].map((t) => t.id));
  const naMira = abertas.filter((t) => !jaListadas.has(t.id) && (t.tags.includes("urgente") || t.tags.includes("prioridade")));
  naMira.forEach((t) => jaListadas.add(t.id));
  const aguardando = abertas.filter((t) => !jaListadas.has(t.id) && t.tags.includes("aguardando"));
  const feitasHoje = tarefas.filter((t) => t.status === "concluido" && t.concluidaEm === hoje);
  const semana = somarDias(hoje, 7);
  const proximas = abertas.filter((t) => t.prazo && t.prazo > hoje && t.prazo <= semana && !jaListadas.has(t.id));

  const totalDia = atrasadas.length + deHoje.length + feitasHoje.length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">O que fazer hoje</p>
        <h2 className="font-serif text-2xl font-semibold text-ink">{dataLonga(hoje)}</h2>
        {totalDia > 0 && (
          <div className="mt-2 flex items-center gap-3">
            <Barra feito={feitasHoje.length} total={totalDia} />
            <span className="text-xs text-muted">
              {feitasHoje.length === totalDia ? "Tudo feito por hoje! 🌿" : `${totalDia - feitasHoje.length} pra resolver hoje`}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Numero rotulo="Pra hoje" valor={deHoje.length} cor="bg-atencao-soft text-atencao" />
        <Numero rotulo="Atrasadas" valor={atrasadas.length} cor="bg-alerta-soft text-alerta" />
        <Numero rotulo="Urgentes" valor={abertas.filter((t) => t.tags.includes("urgente")).length} cor="bg-accent-soft text-accent-ink" />
        <Numero rotulo="Feitas hoje" valor={feitasHoje.length} cor="bg-ok-soft text-ok" />
      </div>

      {!atrasadas.length && !deHoje.length && <Vazio>Nada vencendo hoje. Respira. 🌿 Abaixo, o que vem pela frente.</Vazio>}

      <Secao titulo="Atrasadas" tarefas={atrasadas} ctx={ctx} tom="alerta" />
      <Secao titulo="Pra hoje" tarefas={deHoje} ctx={ctx} tom="atencao" />
      <Secao titulo="Urgente ou prioridade (outros dias)" tarefas={naMira} ctx={ctx} />
      <Secao titulo="Aguardando retorno" tarefas={aguardando} ctx={ctx} />

      {proximas.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-ink">
            Próximos 7 dias <span className="font-normal text-muted">({proximas.length})</span>
          </h3>
          <ul className="divide-y divide-border-soft overflow-hidden rounded-xl border border-border bg-card">
            {proximas.slice(0, 8).map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: categoria(t.categoria).cor }} />
                <span className="flex-1 truncate text-ink">{t.titulo}</span>
                <span className="text-[11px] whitespace-nowrap text-muted">{textoPrazo(t.prazo!, hoje)}</span>
              </li>
            ))}
            {proximas.length > 8 && (
              <li className="px-4 py-2 text-[11px] text-muted">+ {proximas.length - 8} — veja tudo na Lista ou no Calendário</li>
            )}
          </ul>
        </section>
      )}

      <Concluidas tarefas={feitasHoje} ctx={ctx} />
    </div>
  );
}

// ---------- Lista ----------

export function ListaCompleta({ tarefas, ctx }: Props) {
  const { hoje } = ctx;
  if (!tarefas.length) return <Vazio>Nenhuma tarefa com esses filtros.</Vazio>;
  const abertas = tarefas.filter(aberta);
  const amanha = somarDias(hoje, 1);
  const semana = somarDias(hoje, 7);
  return (
    <div className="flex flex-col gap-6">
      <Secao titulo="Atrasadas" tarefas={abertas.filter((t) => atrasada(t, hoje))} ctx={ctx} tom="alerta" />
      <Secao titulo="Hoje" tarefas={abertas.filter((t) => t.prazo === hoje)} ctx={ctx} tom="atencao" />
      <Secao titulo="Amanhã" tarefas={abertas.filter((t) => t.prazo === amanha)} ctx={ctx} />
      <Secao titulo="Próximos 7 dias" tarefas={abertas.filter((t) => t.prazo && t.prazo > amanha && t.prazo <= semana)} ctx={ctx} />
      <Secao titulo="Mais pra frente" tarefas={abertas.filter((t) => t.prazo && t.prazo > semana)} ctx={ctx} />
      <Secao titulo="Sem prazo" tarefas={abertas.filter((t) => !t.prazo)} ctx={ctx} />
      <Concluidas tarefas={tarefas.filter((t) => !aberta(t))} ctx={ctx} />
    </div>
  );
}

// ---------- Kanban ----------

const BORDA_COLUNA: Record<StatusTarefa, string> = {
  a_fazer: "border-t-atencao",
  em_andamento: "border-t-azul",
  concluido: "border-t-ok",
};

function Cartao({ t, ctx }: { t: TarefaUnificada; ctx: Ctx }) {
  const manual = t.origem === "manual";
  const progresso = progressoDe(t);
  const idx = ORDEM_STATUS.indexOf(t.status);
  return (
    <div
      draggable={manual}
      onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
      className={`flex flex-col gap-1.5 rounded-xl border border-border bg-card p-3 ${manual ? "cursor-grab active:cursor-grabbing" : ""} ${
        ctx.acoes.ocupados.has(t.id) ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <CategoriaChip valor={t.categoria} />
        {!manual && (
          <span className="text-[10px] text-muted" title="Anda sozinha conforme o módulo de origem">
            ↻ auto
          </span>
        )}
      </div>
      <div className="flex items-start gap-2">
        {(manual || t.concluir) && <Marcador t={t} ctx={ctx} />}
        <Titulo t={t} ctx={ctx} />
      </div>
      {t.descricao && <p className="line-clamp-2 text-xs text-muted">{t.descricao}</p>}
      {t.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {t.tags.map((v) => (
            <TagChip key={v} valor={v} />
          ))}
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <Prazo t={t} hoje={ctx.hoje} />
        {progresso && <Barra feito={progresso.feito} total={progresso.total} curta />}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {t.link ? (
          <LinkTarefa t={t} className="text-[11px] font-semibold text-ink underline">
            {t.link.rotulo} {t.link.externo ? "↗" : "→"}
          </LinkTarefa>
        ) : (
          <span />
        )}
        <AcaoRapida t={t} ctx={ctx} />
        {manual && (
          <span className="flex gap-1">
            {idx > 0 && (
              <button
                type="button"
                onClick={() => ctx.mover(t, ORDEM_STATUS[idx - 1])}
                title={`Mover para ${ROTULO_STATUS[ORDEM_STATUS[idx - 1]]}`}
                className="rounded px-1.5 text-sm text-muted hover:bg-accent-soft hover:text-ink"
              >
                ‹
              </button>
            )}
            {idx < ORDEM_STATUS.length - 1 && (
              <button
                type="button"
                onClick={() => ctx.mover(t, ORDEM_STATUS[idx + 1])}
                title={`Mover para ${ROTULO_STATUS[ORDEM_STATUS[idx + 1]]}`}
                className="rounded px-1.5 text-sm text-muted hover:bg-accent-soft hover:text-ink"
              >
                ›
              </button>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

export function Kanban({ tarefas, ctx }: Props) {
  const [sobre, setSobre] = useState<StatusTarefa | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted">
        Arraste as suas tarefas entre as colunas (ou use ‹ ›). As automáticas (↻) andam sozinhas conforme você resolve no
        módulo de origem.
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {ORDEM_STATUS.map((status) => {
          const coluna = tarefas.filter((t) => t.status === status);
          return (
            <div
              key={status}
              onDragOver={(e) => {
                e.preventDefault();
                setSobre(status);
              }}
              onDragLeave={() => setSobre((s) => (s === status ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                setSobre(null);
                const t = tarefas.find((x) => x.id === e.dataTransfer.getData("text/plain"));
                if (t && t.origem === "manual" && t.status !== status) ctx.mover(t, status);
              }}
              className={`flex min-h-40 flex-col gap-2 rounded-2xl border border-t-4 border-border p-2.5 transition-colors ${BORDA_COLUNA[status]} ${
                sobre === status ? "bg-accent-soft" : "bg-accent-soft/40"
              }`}
            >
              <h3 className="flex items-center justify-between px-1 text-xs font-semibold text-ink">
                {ROTULO_STATUS[status]}
                <span className="rounded-full bg-card px-2 py-0.5 text-[11px] text-muted tabular-nums">{coluna.length}</span>
              </h3>
              {coluna.map((t) => (
                <Cartao key={t.id} t={t} ctx={ctx} />
              ))}
              {!coluna.length && <p className="py-4 text-center text-[11px] text-muted">Vazio</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Calendario ----------

const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function Calendario({ tarefas, ctx }: Props) {
  const { hoje } = ctx;
  const [mes, setMes] = useState(hoje.slice(0, 7)); // AAAA-MM
  const [dia, setDia] = useState(hoje);

  const primeiro = `${mes}-01`;
  const inicio = somarDias(primeiro, -diaDaSemana(primeiro));
  const grade = Array.from({ length: 42 }, (_, i) => somarDias(inicio, i));
  const dias = grade.slice(35).every((d) => !d.startsWith(mes)) ? grade.slice(0, 35) : grade;

  const porDia = new Map<string, TarefaUnificada[]>();
  for (const t of tarefas) if (t.prazo) porDia.set(t.prazo, [...(porDia.get(t.prazo) ?? []), t]);
  const semPrazo = tarefas.filter((t) => !t.prazo && aberta(t)).length;
  const doDia = porDia.get(dia) ?? [];

  function mudarMes(delta: number) {
    const d = new Date(`${primeiro}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + delta);
    setMes(d.toISOString().slice(0, 7));
  }

  const seta = "rounded-full px-2.5 py-1 text-sm text-muted hover:bg-accent-soft hover:text-ink";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => mudarMes(-1)} className={seta} aria-label="Mês anterior">
            ‹
          </button>
          <h2 className="min-w-40 text-center font-serif text-lg font-semibold text-ink">{nomeDoMes(primeiro)}</h2>
          <button type="button" onClick={() => mudarMes(1)} className={seta} aria-label="Próximo mês">
            ›
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            setMes(hoje.slice(0, 7));
            setDia(hoje);
          }}
          className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-ink/70 hover:bg-border"
        >
          Hoje
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid grid-cols-7 bg-accent-soft">
          {SEMANA.map((d) => (
            <div key={d} className="py-1.5 text-center text-[11px] font-semibold text-muted">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {dias.map((d) => {
            const lista = porDia.get(d) ?? [];
            const fora = !d.startsWith(mes);
            const temAtraso = lista.some((t) => atrasada(t, hoje));
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDia(d)}
                className={`flex min-h-16 flex-col gap-0.5 border-t border-l border-border-soft p-1 text-left sm:min-h-24 [&:nth-child(7n+1)]:border-l-0 ${
                  fora ? "bg-background" : "bg-card"
                } ${d === dia ? "ring-2 ring-ink ring-inset" : "hover:bg-accent-soft/60"}`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                    d === hoje ? "bg-ink text-background" : fora ? "text-muted/50" : "text-ink"
                  }`}
                >
                  {Number(d.slice(8))}
                </span>
                {/* Celular: so bolinhas; tela maior: titulos */}
                <span className="flex flex-wrap gap-0.5 sm:hidden">
                  {lista.slice(0, 4).map((t) => (
                    <span
                      key={t.id}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: aberta(t) ? categoria(t.categoria).cor : "var(--border)" }}
                    />
                  ))}
                </span>
                <span className="hidden flex-col gap-0.5 sm:flex">
                  {lista.slice(0, 3).map((t) => (
                    <span
                      key={t.id}
                      className={`truncate rounded border-l-2 px-1 text-[10px] leading-4 ${aberta(t) ? "text-ink" : "text-muted line-through"} ${
                        atrasada(t, hoje) ? "bg-alerta-soft" : "bg-accent-soft"
                      }`}
                      style={{ borderLeftColor: categoria(t.categoria).cor }}
                    >
                      {t.titulo}
                    </span>
                  ))}
                  {lista.length > 3 && (
                    <span className={`px-1 text-[10px] ${temAtraso ? "text-alerta" : "text-muted"}`}>+{lista.length - 3} mais</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink">
            {dataLonga(dia)} <span className="font-normal text-muted">({doDia.length})</span>
          </h3>
          <button type="button" onClick={() => ctx.nova(dia)} className="text-xs font-semibold text-ink underline">
            + Tarefa neste dia
          </button>
        </div>
        {doDia.length ? <Lista tarefas={doDia} ctx={ctx} /> : <Vazio>Nenhuma tarefa com prazo neste dia.</Vazio>}
        {semPrazo > 0 && (
          <p className="text-[11px] text-muted">
            {semPrazo} {semPrazo === 1 ? "tarefa sem prazo não aparece" : "tarefas sem prazo não aparecem"} no calendário — veja na Lista.
          </p>
        )}
      </section>
    </div>
  );
}
