"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MktCanal } from "@prisma/client";
import { DetalhesConteudo, type ConteudoCompleto } from "@/components/marketing/DetalhesConteudo";
import { EditarConteudo } from "@/components/marketing/EditarConteudo";
import { chamarApi } from "@/components/marketing/Acoes";
import { CANAIS } from "@/lib/marketing/rotulos";
import { diaISO } from "@/lib/marketing/datas";

// Calendario no formato do Mensal Datado: grade de segunda a domingo, cada
// conteudo e um post-it colado no dia. Tocar no post-it abre ele ampliado
// com tudo (roteiro, legenda, Canva, botoes de aprovar/postar).

const SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
// "@unicaplanner" -> "Unica", "@larirotina" -> "Lari", "Collab ..." -> "Collab".
const PERFIL_CURTO = (p: string) => (/unica/i.test(p) && !/collab/i.test(p) ? "Unica" : /lari/i.test(p) && !/collab/i.test(p) ? "Lari" : p.split(" ")[0]);
// Faixa das datas da marca e das campanhas dentro do dia.
const MARCA: Record<string, string> = {
  campanha: "bg-ink/85 text-background",
  marca: "bg-rosa-soft text-rosa",
  recesso: "bg-border text-muted",
  pico: "bg-ok-soft text-ok",
  sazonal: "bg-azul-soft text-azul",
  feriado: "bg-accent-soft text-accent-ink",
};
const CURTO: Record<MktCanal, string> = { stories: "Story", instagram: "IG", tiktok: "TT", youtube: "YT", email: "Mail", blog: "Blog" };

export function CalendarioMensal({
  dias,
  mes,
  hoje,
  itens,
  marcas = {},
  abrirInicial,
}: {
  dias: string[];
  mes: string; // AAAA-MM
  hoje: string;
  itens: ConteudoCompleto[];
  marcas?: Record<string, { texto: string; tipo: string }[]>; // datas da marca e campanhas do dia
  abrirInicial?: string;
}) {
  const [aberto, setAberto] = useState<string | null>(abrirInicial ?? null);
  const dialogo = useRef<HTMLDialogElement>(null);
  const atual = itens.find((c) => c.id === aberto) ?? null;
  // Dia do "Novo post" (null = fechado).
  const [novoDia, setNovoDia] = useState<string | null>(null);
  const dialogoNovo = useRef<HTMLDialogElement>(null);
  // Arrastar o post-it pra outro dia remarca o post.
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (atual && !d.open) d.showModal();
    if (!atual && d.open) d.close();
  }, [atual]);

  useEffect(() => {
    const d = dialogoNovo.current;
    if (!d) return;
    if (novoDia && !d.open) d.showModal();
    if (!novoDia && d.open) d.close();
  }, [novoDia]);

  async function soltar(dia: string) {
    const id = arrastando;
    setArrastando(null);
    setAlvo(null);
    if (!id) return;
    const c = itens.find((x) => x.id === id);
    if (!c || diaISO(c.data) === dia) return;
    setAviso("Remarcando…");
    try {
      await chamarApi(`/api/marketing/conteudos/${id}`, { acao: "remarcar", data: dia });
      setAviso(null);
      startTransition(() => router.refresh());
    } catch (e) {
      setAviso((e as Error).message);
    }
  }

  const porDia = new Map<string, ConteudoCompleto[]>();
  for (const c of itens) {
    const dia = diaISO(c.data);
    porDia.set(dia, [...(porDia.get(dia) ?? []), c]);
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setNovoDia(hoje.startsWith(mes) ? hoje : `${mes}-01`)}
          className="rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-background transition hover:opacity-90"
        >
          ＋ Novo post
        </button>
        <span className="hidden text-xs text-muted sm:inline">Dica: arraste um post-it pra outro dia pra remarcar.</span>
        {aviso && <span className="text-xs text-alerta">{aviso}</span>}
      </div>

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
                onDragOver={(e) => {
                  if (!arrastando) return;
                  e.preventDefault();
                  if (alvo !== dia) setAlvo(dia);
                }}
                onDragLeave={() => alvo === dia && setAlvo(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  soltar(dia);
                }}
                className={`group flex min-h-24 min-w-0 flex-col gap-1 border-border-soft p-1 sm:min-h-32 sm:p-1.5 ${i % 7 ? "border-l" : ""} ${
                  i >= 7 ? "border-t" : ""
                } ${alvo === dia ? "bg-accent-soft ring-2 ring-accent-ink ring-inset" : doMes ? "" : "bg-background/70"}`}
              >
                <span className="flex items-start justify-between gap-1">
                <button
                  type="button"
                  onClick={() => setNovoDia(dia)}
                  aria-label={`Novo post em ${dia.slice(8)}/${dia.slice(5, 7)}`}
                  className="hidden h-5 w-5 items-center justify-center rounded-full text-sm leading-none text-muted opacity-0 transition group-hover:opacity-100 hover:bg-accent-soft hover:text-ink focus:opacity-100 sm:flex"
                >
                  +
                </button>
                <span
                  className={`ml-auto font-serif text-xs leading-none sm:text-sm ${
                    ehHoje ? "rounded-full bg-ink px-1.5 py-0.5 text-background" : doMes ? "text-ink" : "text-muted/60"
                  }`}
                >
                  {Number(dia.slice(8))}
                </span>
                </span>
                {(marcas[dia] ?? []).map((m) => (
                  <span
                    key={m.texto}
                    title={m.texto}
                    className={`truncate rounded-sm px-1 text-[9px] leading-4 font-semibold sm:text-[10px] ${MARCA[m.tipo] ?? MARCA.marca}`}
                  >
                    {m.texto}
                  </span>
                ))}
                {doDia.map((c, k) => {
                  const publicado = c.status === "publicado";
                  const passou = dia < hoje && !publicado;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setAberto(c.id)}
                      draggable={!publicado}
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", c.id);
                        setArrastando(c.id);
                      }}
                      onDragEnd={() => {
                        setArrastando(null);
                        setAlvo(null);
                      }}
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

      <dialog
        ref={dialogoNovo}
        onClose={() => setNovoDia(null)}
        className="m-auto max-h-[92dvh] w-[min(46rem,calc(100vw-1rem))] overflow-y-auto rounded-2xl bg-background p-0 text-ink shadow-xl backdrop:bg-ink/40"
      >
        {novoDia && (
          <div className="p-3 sm:p-4">
            <EditarConteudo
              key={novoDia}
              inicial={{ data: novoDia }}
              onPronto={(id) => {
                setNovoDia(null);
                if (id) setAberto(id);
              }}
              onCancelar={() => setNovoDia(null)}
            />
          </div>
        )}
      </dialog>
    </>
  );
}
