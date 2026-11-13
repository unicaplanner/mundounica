"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { MktCanal } from "@prisma/client";
import { DetalhesConteudo, type ConteudoCompleto } from "@/components/marketing/DetalhesConteudo";
import { CANAIS } from "@/lib/marketing/rotulos";
import { diaISO } from "@/lib/marketing/datas";

// Calendario no formato do Mensal Datado: grade de segunda a domingo, cada
// conteudo e um post-it colado no dia. Tocar no post-it abre ele ampliado
// com tudo (roteiro, legenda, Canva, botoes de aprovar/postar).

const SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
// "@unicaplanner" -> "Unica", "@larirotina" -> "Lari", "Collab ..." -> "Collab".
const PERFIL_CURTO = (p: string) => (/unica/i.test(p) && !/collab/i.test(p) ? "Unica" : /lari/i.test(p) && !/collab/i.test(p) ? "Lari" : p.split(" ")[0]);
const CURTO: Record<MktCanal, string> = { stories: "Story", instagram: "IG", tiktok: "TT", youtube: "YT", email: "Mail", blog: "Blog" };

export function CalendarioMensal({
  dias,
  mes,
  hoje,
  itens,
  abrirInicial,
}: {
  dias: string[];
  mes: string; // AAAA-MM
  hoje: string;
  itens: ConteudoCompleto[];
  abrirInicial?: string;
}) {
  const [aberto, setAberto] = useState<string | null>(abrirInicial ?? null);
  const dialogo = useRef<HTMLDialogElement>(null);
  const atual = itens.find((c) => c.id === aberto) ?? null;

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (atual && !d.open) d.showModal();
    if (!atual && d.open) d.close();
  }, [atual]);

  const porDia = new Map<string, ConteudoCompleto[]>();
  for (const c of itens) {
    const dia = diaISO(c.data);
    porDia.set(dia, [...(porDia.get(dia) ?? []), c]);
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid grid-cols-7 border-b border-border bg-accent-soft">
          {SEMANA.map((d) => (
            <div key={d} className="px-1 py-2 text-center text-[11px] font-semibold tracking-wider text-accent-ink uppercase sm:text-xs">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {dias.map((dia, i) => {
            const doMes = dia.startsWith(mes);
            const ehHoje = dia === hoje;
            const doDia = porDia.get(dia) ?? [];
            return (
              <div
                key={dia}
                className={`flex min-h-24 min-w-0 flex-col gap-1 border-border-soft p-1 sm:min-h-32 sm:p-1.5 ${i % 7 ? "border-l" : ""} ${
                  i >= 7 ? "border-t" : ""
                } ${doMes ? "" : "bg-background/70"}`}
              >
                <span
                  className={`self-end font-serif text-xs leading-none sm:text-sm ${
                    ehHoje ? "rounded-full bg-ink px-1.5 py-0.5 text-background" : doMes ? "text-ink" : "text-muted/60"
                  }`}
                >
                  {Number(dia.slice(8))}
                </span>
                {doDia.map((c, k) => {
                  const publicado = c.status === "publicado";
                  const passou = dia < hoje && !publicado;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setAberto(c.id)}
                      title={`${CANAIS[c.canal].rotulo}${c.perfil ? ` · ${c.perfil}` : ""} · ${c.titulo}`}
                      className={`relative w-full min-w-0 rounded-[3px] px-1 py-0.5 text-left text-[10px] leading-tight shadow-[0_1px_2px_rgba(43,38,32,0.15)] transition hover:z-10 hover:scale-105 sm:px-1.5 sm:py-1 sm:text-[11px] ${
                        CANAIS[c.canal].chip
                      } ${k % 2 ? "rotate-1" : "-rotate-1"} ${publicado || passou ? "opacity-55" : ""} ${
                        c.nivel === "extra" || c.status === "ideia" ? "border border-dashed border-current/40" : ""
                      }`}
                    >
                      <span className="block truncate font-semibold sm:hidden">{CURTO[c.canal]}</span>
                      <span className="hidden font-semibold sm:block">
                        {publicado ? "✓ " : c.status === "roteiro" ? "• " : ""}
                        {CURTO[c.canal]}
                        {c.perfil && <span className="font-normal opacity-80"> · {PERFIL_CURTO(c.perfil)}</span>}
                        {c.horario && <span className="font-normal opacity-80"> · {c.horario}</span>}
                      </span>
                      <span className="hidden text-ink sm:line-clamp-2">{c.titulo}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <dialog
        ref={dialogo}
        onClose={() => setAberto(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setAberto(null);
        }}
        className="m-auto max-h-[92dvh] w-[min(46rem,calc(100vw-1rem))] overflow-y-auto rounded-2xl bg-background p-0 text-ink shadow-xl backdrop:bg-ink/40"
      >
        {atual && (
          <div className="flex flex-col gap-4 p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <Link href={`/marketing/conteudo/${atual.id}`} className="text-xs text-muted underline">
                Abrir em página inteira
              </Link>
              <button
                type="button"
                onClick={() => setAberto(null)}
                className="rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-ink hover:bg-border"
                aria-label="Fechar"
              >
                Fechar ✕
              </button>
            </div>
            <div className={`h-1.5 rounded-full ${CANAIS[atual.canal].ponto}`} />
            <DetalhesConteudo c={atual} />
          </div>
        )}
      </dialog>
    </>
  );
}
