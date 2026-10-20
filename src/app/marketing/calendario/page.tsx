import Link from "next/link";
import type { MktCanal, MktNivel } from "@prisma/client";
import { prisma } from "@/lib/db";
import { PastaDrive } from "@/components/marketing/Acoes";
import { CANAIS, ORDEM_CANAIS, PRODUZIDO, STATUS } from "@/lib/marketing/rotulos";
import { dataComDia, dataCurta, diaISO, hojeISO } from "@/lib/marketing/datas";

export const dynamic = "force-dynamic";

type Modo = "realista" | "estrategico";

function linkCalendario(p: { lote: number; modo: Modo; canal?: string }) {
  const q = new URLSearchParams({ lote: String(p.lote), modo: p.modo });
  if (p.canal) q.set("canal", p.canal);
  return `/marketing/calendario?${q}`;
}

function Barra({ rotulo, feitos, total }: { rotulo: string; feitos: number; total: number }) {
  const pct = total ? Math.round((feitos / total) * 100) : 0;
  return (
    <div className="flex-1">
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-semibold text-ink">{rotulo}</span>
        <span className="text-muted tabular-nums">
          {feitos} de {total} prontos
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-accent-soft">
        <div className="h-full rounded-full bg-ok" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function CalendarioPage({ searchParams }: PageProps<"/marketing/calendario">) {
  const sp = await searchParams;
  const hoje = hojeISO();
  const lotes = await prisma.mktLote.findMany({ orderBy: { numero: "asc" } });

  if (!lotes.length) {
    return <p className="text-sm text-muted">O calendário ainda não foi carregado.</p>;
  }

  // Sem lote na URL: o lote de hoje (ou o primeiro, antes de comecar).
  const pedido = Number(sp.lote);
  const lote =
    lotes.find((l) => l.numero === pedido) ??
    lotes.find((l) => diaISO(l.inicio) <= hoje && hoje <= diaISO(l.fim)) ??
    lotes[0];
  const modo: Modo = sp.modo === "estrategico" ? "estrategico" : "realista";
  const canal = ORDEM_CANAIS.includes(sp.canal as MktCanal) ? (sp.canal as MktCanal) : undefined;

  const todos = await prisma.mktConteudo.findMany({
    where: { loteId: lote.id },
    orderBy: [{ data: "asc" }, { horario: "asc" }],
    select: { id: true, data: true, horario: true, canal: true, formato: true, nivel: true, titulo: true, gancho: true, status: true, reaproveita: true },
  });

  const conta = (nivel: MktNivel) => {
    const doNivel = todos.filter((c) => c.nivel === nivel);
    return { total: doNivel.length, feitos: doNivel.filter((c) => PRODUZIDO.includes(c.status)).length };
  };
  const realista = conta("realista");
  const extra = conta("extra");
  const paraAprovar = todos.filter((c) => c.status === "roteiro").length;

  // "9h" antes de "12h": o horario e texto, entao ordena pelo numero.
  const hora = (h: string | null) => (h ? parseInt(h, 10) : 99);
  const visiveis = todos
    .filter((c) => (modo === "realista" ? c.nivel === "realista" : true) && (!canal || c.canal === canal))
    .sort((a, b) => a.data.getTime() - b.data.getTime() || hora(a.horario) - hora(b.horario));
  const porDia = new Map<string, typeof visiveis>();
  for (const c of visiveis) {
    const dia = diaISO(c.data);
    porDia.set(dia, [...(porDia.get(dia) ?? []), c]);
  }

  const chip = (ativo: boolean) =>
    `rounded-full px-3 py-1 text-xs font-semibold transition-colors ${ativo ? "bg-ink text-background" : "bg-accent-soft text-ink/70 hover:bg-border"}`;

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Lotes" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {lotes.map((l) => (
          <Link
            key={l.id}
            href={linkCalendario({ lote: l.numero, modo, canal })}
            aria-current={l.id === lote.id ? "page" : undefined}
            className={`shrink-0 rounded-xl border px-3 py-2 text-left text-xs transition ${
              l.id === lote.id ? "border-ink bg-card" : "border-border bg-card/60 hover:bg-card"
            }`}
          >
            <span className="block font-semibold text-ink">Lote {l.numero}</span>
            <span className="text-muted">
              {dataCurta(l.inicio)} – {dataCurta(l.fim)}
            </span>
          </Link>
        ))}
      </nav>

      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div>
          <h2 className="font-serif text-xl font-semibold text-ink">{lote.titulo}</h2>
          {lote.foco && <p className="mt-1 text-sm text-muted">{lote.foco}</p>}
        </div>
        {todos.length > 0 ? (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
              <Barra rotulo="Realista" {...realista} />
              <Barra rotulo="Extras (até o estratégico)" {...extra} />
            </div>
            <p className="text-xs text-muted">
              Produza primeiro todo o realista do lote. Sobrou tempo? Troque pra “Estratégico” e faça os extras.
              {paraAprovar > 0 && (
                <>
                  {" "}
                  <Link href="/marketing/tarefas" className="font-semibold text-atencao underline">
                    {paraAprovar} {paraAprovar === 1 ? "roteiro espera" : "roteiros esperam"} sua aprovação.
                  </Link>
                </>
              )}
            </p>
            <PastaDrive key={lote.id} loteId={lote.id} url={lote.pastaDriveUrl} />
          </>
        ) : (
          <p className="text-sm text-muted">Os roteiros deste lote ainda vão ser escritos.</p>
        )}
      </section>

      {todos.length > 0 && (
        <>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Ritmo">
              <Link href={linkCalendario({ lote: lote.numero, modo: "realista", canal })} className={chip(modo === "realista")}>
                Realista
              </Link>
              <Link href={linkCalendario({ lote: lote.numero, modo: "estrategico", canal })} className={chip(modo === "estrategico")}>
                Estratégico (com extras)
              </Link>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Canal">
              <Link href={linkCalendario({ lote: lote.numero, modo })} className={chip(!canal)}>
                Todos os canais
              </Link>
              {ORDEM_CANAIS.filter((c) => todos.some((t) => t.canal === c)).map((c) => (
                <Link key={c} href={linkCalendario({ lote: lote.numero, modo, canal: c })} className={chip(canal === c)}>
                  {CANAIS[c].rotulo}
                </Link>
              ))}
            </div>
          </div>

          <ol className="flex flex-col gap-5">
            {[...porDia.entries()].map(([dia, itens]) => (
              <li key={dia} id={`dia-${dia}`} className="flex flex-col gap-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold capitalize text-ink">
                  {dataComDia(dia)}
                  {dia === hoje && <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] normal-case text-background">hoje</span>}
                </h3>
                <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {itens.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/marketing/conteudo/${c.id}`}
                        className="flex h-full flex-col gap-1.5 rounded-xl border border-border bg-card p-3 transition hover:border-accent-ink"
                      >
                        <span className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                          <span className={`rounded-full px-2 py-0.5 ${CANAIS[c.canal].chip}`}>{CANAIS[c.canal].rotulo}</span>
                          <span className="text-muted">
                            {c.formato}
                            {c.horario && ` · ${c.horario}`}
                          </span>
                          {c.nivel === "extra" && <span className="rounded-full border border-dashed border-muted px-2 py-0.5 text-muted">extra</span>}
                          <span className={`ml-auto rounded-full px-2 py-0.5 ${STATUS[c.status].chip}`}>{STATUS[c.status].rotulo}</span>
                        </span>
                        <span className="text-sm font-semibold text-ink">{c.titulo}</span>
                        {c.gancho && <span className="line-clamp-2 text-xs text-muted">“{c.gancho}”</span>}
                        {c.reaproveita && <span className="text-[11px] text-muted">Reaproveita um vídeo já gravado</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
            {!porDia.size && <p className="text-sm text-muted">Nada neste filtro.</p>}
          </ol>
        </>
      )}
    </div>
  );
}
