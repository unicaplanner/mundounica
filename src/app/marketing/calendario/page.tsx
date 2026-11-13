import Link from "next/link";
import type { MktCanal, MktNivel } from "@prisma/client";
import { prisma } from "@/lib/db";
import { PastaDrive } from "@/components/marketing/Acoes";
import { CalendarioMensal } from "@/components/marketing/CalendarioMensal";
import { CANAIS, ORDEM_CANAIS, PRODUZIDO } from "@/lib/marketing/rotulos";
import { dataCurta, diaISO, hojeISO, somarDias } from "@/lib/marketing/datas";

export const dynamic = "force-dynamic";

type Modo = "realista" | "estrategico";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function linkCalendario(p: { mes: string; modo: Modo; canal?: string }) {
  const q = new URLSearchParams({ mes: p.mes, modo: p.modo });
  if (p.canal) q.set("canal", p.canal);
  return `/marketing/calendario?${q}`;
}

function outroMes(mes: string, delta: number) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + delta, 1));
  return diaISO(d).slice(0, 7);
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
  const mes = typeof sp.mes === "string" && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : hoje.slice(0, 7);
  const modo: Modo = sp.modo === "estrategico" ? "estrategico" : "realista";
  const canal = ORDEM_CANAIS.includes(sp.canal as MktCanal) ? (sp.canal as MktCanal) : undefined;
  const abrir = typeof sp.abrir === "string" ? sp.abrir : undefined;

  // Grade de segunda a domingo cobrindo o mes inteiro.
  const primeiro = `${mes}-01`;
  const ultimo = somarDias(`${outroMes(mes, 1)}-01`, -1);
  const recuo = (new Date(`${primeiro}T00:00:00Z`).getUTCDay() + 6) % 7;
  const avanco = (7 - new Date(`${ultimo}T00:00:00Z`).getUTCDay()) % 7;
  const inicio = somarDias(primeiro, -recuo);
  const fim = somarDias(ultimo, avanco);
  const dias: string[] = [];
  for (let d = inicio; d <= fim; d = somarDias(d, 1)) dias.push(d);

  const [conteudos, lotes] = await Promise.all([
    prisma.mktConteudo.findMany({
      where: { data: { gte: new Date(`${inicio}T00:00:00Z`), lte: new Date(`${fim}T00:00:00Z`) }, arquivadoEm: null },
      include: { lote: { select: { numero: true, pastaDriveUrl: true } } },
      orderBy: [{ data: "asc" }],
    }),
    prisma.mktLote.findMany({
      where: { inicio: { lte: new Date(`${ultimo}T00:00:00Z`) }, fim: { gte: new Date(`${primeiro}T00:00:00Z`) } },
      orderBy: { numero: "asc" },
    }),
  ]);

  const codigos = conteudos.map((c) => c.reaproveita).filter((x): x is string => !!x);
  const origens = codigos.length
    ? await prisma.mktConteudo.findMany({ where: { codigo: { in: codigos } }, select: { id: true, titulo: true, formato: true, codigo: true } })
    : [];
  const origemPor = new Map(origens.map((o) => [o.codigo, { id: o.id, titulo: o.titulo, formato: o.formato }]));

  // "9h" antes de "12h": o horario e texto, entao ordena pelo numero.
  const hora = (h: string | null) => (h ? parseInt(h, 10) : 99);
  const visiveis = conteudos
    .filter((c) => (modo === "realista" ? c.nivel === "realista" : true) && (!canal || c.canal === canal))
    .sort((a, b) => a.data.getTime() - b.data.getTime() || hora(a.horario) - hora(b.horario))
    .map((c) => ({ ...c, origem: c.reaproveita ? (origemPor.get(c.reaproveita) ?? null) : null }));

  const doMes = conteudos.filter((c) => diaISO(c.data).startsWith(mes));
  const conta = (nivel: MktNivel) => {
    const n = doMes.filter((c) => c.nivel === nivel);
    return { total: n.length, feitos: n.filter((c) => PRODUZIDO.includes(c.status)).length };
  };
  const paraAprovar = doMes.filter((c) => c.status === "roteiro").length;
  const [ano, m] = mes.split("-").map(Number);

  const chip = (ativo: boolean) =>
    `rounded-full px-3 py-1 text-xs font-semibold transition-colors ${ativo ? "bg-ink text-background" : "bg-accent-soft text-ink/70 hover:bg-border"}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <Link href={linkCalendario({ mes: outroMes(mes, -1), modo, canal })} className={chip(false)} aria-label="Mês anterior">
          ‹ {MESES[(m + 10) % 12]}
        </Link>
        <h2 className="text-center">
          <span className="block font-serif text-3xl font-semibold text-ink capitalize sm:text-4xl">{MESES[m - 1]}</span>
          <span className="brand-mark text-xs text-accent-ink">{ano}</span>
        </h2>
        <Link href={linkCalendario({ mes: outroMes(mes, 1), modo, canal })} className={chip(false)} aria-label="Próximo mês">
          {MESES[m % 12]} ›
        </Link>
      </div>

      {doMes.length > 0 && (
        <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
            <Barra rotulo="Realista" {...conta("realista")} />
            <Barra rotulo="Extras (até o estratégico)" {...conta("extra")} />
          </div>
          {paraAprovar > 0 && (
            <Link href="/marketing/tarefas?tipo=aprovar" className="text-xs font-semibold text-atencao underline">
              {paraAprovar} {paraAprovar === 1 ? "roteiro espera" : "roteiros esperam"} sua aprovação neste mês.
            </Link>
          )}
        </section>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Ritmo">
          <Link href={linkCalendario({ mes, modo: "realista", canal })} className={chip(modo === "realista")}>
            Realista
          </Link>
          <Link href={linkCalendario({ mes, modo: "estrategico", canal })} className={chip(modo === "estrategico")}>
            Estratégico (com extras)
          </Link>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Canal">
          <Link href={linkCalendario({ mes, modo })} className={chip(!canal)}>
            Todos os canais
          </Link>
          {ORDEM_CANAIS.map((c) => (
            <Link key={c} href={linkCalendario({ mes, modo, canal: c })} className={`${chip(canal === c)} inline-flex items-center gap-1.5`}>
              <span className={`h-2 w-2 rounded-full ${CANAIS[c].ponto}`} />
              {CANAIS[c].rotulo}
            </Link>
          ))}
        </div>
      </div>

      <CalendarioMensal key={`${mes}-${modo}-${canal ?? ""}`} dias={dias} mes={mes} hoje={hoje} itens={visiveis} abrirInicial={abrir} />

      <p className="text-xs text-muted">
        Toque num post-it pra abrir. • = roteiro pra você aprovar · ✓ = publicado · borda tracejada = extra · apagadinho = já
        passou ou já foi postado.
      </p>

      {lotes.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-ink">Pastas do Drive dos lotes deste mês</h3>
          {lotes.map((l) => (
            <div key={l.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
              <p className="text-sm text-ink">
                <span className="font-semibold">{l.titulo}</span>{" "}
                <span className="text-muted">
                  ({dataCurta(l.inicio)} – {dataCurta(l.fim)})
                </span>
              </p>
              <PastaDrive loteId={l.id} url={l.pastaDriveUrl} />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
