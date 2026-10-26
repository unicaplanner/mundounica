"use client";

import Link from "next/link";
import { atrasada, progressoDe, textoPrazo, type StatusTarefa, type TarefaUnificada } from "@/lib/tarefas/meta";
import { Barra, CategoriaChip, TagChip } from "./Chips";
import type { Acoes } from "./useAcoes";

// O que as visoes recebem do organizador.
export type Ctx = {
  hoje: string;
  acoes: Acoes;
  editar: (t: TarefaUnificada) => void;
  alternar: (t: TarefaUnificada) => void;
  mover: (t: TarefaUnificada, status: StatusTarefa) => void;
  nova: (prazo: string | null) => void;
};

export function LinkTarefa({ t, className, children }: { t: TarefaUnificada; className?: string; children: React.ReactNode }) {
  if (!t.link) return null;
  return t.link.externo ? (
    <a href={t.link.href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  ) : (
    <Link href={t.link.href} className={className}>
      {children}
    </Link>
  );
}

export function Prazo({ t, hoje }: { t: TarefaUnificada; hoje: string }) {
  if (!t.prazo) return <span className="text-[11px] text-muted/70">Sem prazo</span>;
  const atrasou = atrasada(t, hoje);
  const ehHoje = t.prazo === hoje && t.status !== "concluido";
  return (
    <span className={`text-[11px] font-semibold whitespace-nowrap ${atrasou ? "text-alerta" : ehHoje ? "text-atencao" : "text-muted"}`}>
      {atrasou ? "⚠ " : ""}
      {textoPrazo(t.prazo, hoje)}
    </span>
  );
}

// Manual ou automatica com "concluir": quadradinho. As outras automaticas
// andam sozinhas quando a coisa e feita no modulo (simbolo ↻).
export function Marcador({ t, ctx }: { t: TarefaUnificada; ctx: Ctx }) {
  const feita = t.status === "concluido";
  if (t.origem === "manual" || t.concluir) {
    return (
      <input
        type="checkbox"
        checked={feita}
        disabled={ctx.acoes.ocupados.has(t.id) || (feita && t.origem === "auto")}
        onChange={() => ctx.alternar(t)}
        aria-label={feita ? "Reabrir tarefa" : "Marcar como feita"}
        className="mt-0.5 h-4 w-4 cursor-pointer accent-[var(--ink)]"
      />
    );
  }
  return (
    <span
      title="Automática: sai daqui sozinha quando você resolve no módulo"
      className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-dashed border-muted/60 text-[9px] text-muted"
    >
      ↻
    </span>
  );
}

export function Titulo({ t, ctx, className = "" }: { t: TarefaUnificada; ctx: Ctx; className?: string }) {
  const feita = t.status === "concluido";
  const cls = `text-left text-sm font-semibold hover:underline ${feita ? "text-muted line-through" : "text-ink"} ${className}`;
  if (t.origem === "manual") {
    return (
      <button type="button" onClick={() => ctx.editar(t)} className={cls}>
        {t.titulo}
      </button>
    );
  }
  return t.link ? (
    <LinkTarefa t={t} className={cls}>
      {t.titulo}
    </LinkTarefa>
  ) : (
    <span className={cls}>{t.titulo}</span>
  );
}

export function AcaoRapida({ t, ctx }: { t: TarefaUnificada; ctx: Ctx }) {
  if (!t.acao || t.status === "concluido") return null;
  const ocupado = ctx.acoes.ocupados.has(t.id);
  return (
    <button
      type="button"
      disabled={ocupado}
      onClick={() => ctx.acoes.chamar(t.id, t.acao!)}
      className="rounded-full bg-ok-soft px-2.5 py-0.5 text-[11px] font-semibold text-ok transition hover:bg-ok hover:text-background disabled:opacity-50"
    >
      {ocupado ? "Salvando..." : t.acao.rotulo}
    </button>
  );
}

export function ItemLista({ t, ctx }: { t: TarefaUnificada; ctx: Ctx }) {
  const progresso = progressoDe(t);
  return (
    <li className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent-soft/50">
      <Marcador t={t} ctx={ctx} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Titulo t={t} ctx={ctx} />
          {t.tags.map((v) => (
            <TagChip key={v} valor={v} />
          ))}
        </div>
        {t.descricao && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{t.descricao}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <CategoriaChip valor={t.categoria} />
          {progresso && <Barra feito={progresso.feito} total={progresso.total} />}
          {t.link && (
            <LinkTarefa t={t} className="text-[11px] font-semibold text-ink underline">
              {t.link.rotulo} {t.link.externo ? "↗" : "→"}
            </LinkTarefa>
          )}
          <AcaoRapida t={t} ctx={ctx} />
        </div>
      </div>
      <Prazo t={t} hoje={ctx.hoje} />
    </li>
  );
}

export function Lista({ tarefas, ctx }: { tarefas: TarefaUnificada[]; ctx: Ctx }) {
  return (
    <ul className="divide-y divide-border-soft overflow-hidden rounded-xl border border-border bg-card">
      {tarefas.map((t) => (
        <ItemLista key={t.id} t={t} ctx={ctx} />
      ))}
    </ul>
  );
}

export function Secao({
  titulo,
  tarefas,
  ctx,
  tom,
}: {
  titulo: string;
  tarefas: TarefaUnificada[];
  ctx: Ctx;
  tom?: "alerta" | "atencao";
}) {
  if (!tarefas.length) return null;
  const cor = tom === "alerta" ? "text-alerta" : tom === "atencao" ? "text-atencao" : "text-ink";
  return (
    <section className="flex flex-col gap-2">
      <h3 className={`text-sm font-semibold ${cor}`}>
        {titulo} <span className="font-normal text-muted">({tarefas.length})</span>
      </h3>
      <Lista tarefas={tarefas} ctx={ctx} />
    </section>
  );
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">{children}</p>;
}
