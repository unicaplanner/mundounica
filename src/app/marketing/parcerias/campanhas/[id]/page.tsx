import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatarReais } from "@/lib/financeiro/formato";
import { COMBINADOS, DICAS_DE_DM, estimativaDaOnda } from "@/lib/parcerias/campanhas";
import { etapaPosFechar, investimento, listarCriadoras } from "@/lib/parcerias/consultas";
import { dataBR, dataISO, nomeExibicao } from "@/lib/parcerias/formato";
import { formatarSeguidores } from "@/lib/parcerias/perfil";
import { STATUS } from "@/lib/parcerias/rotulos";
import { BotaoAcao } from "@/components/parcerias/BotaoAcao";
import { EditorCampos } from "@/components/parcerias/EditorCampos";
import { StatusSelect } from "@/components/parcerias/StatusSelect";
import { Tarefas } from "@/components/parcerias/Tarefas";

export const dynamic = "force-dynamic";

export default async function CampanhaPage({ params, searchParams }: PageProps<"/marketing/parcerias/campanhas/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const loteFiltro = typeof sp.lote === "string" && /^\d+$/.test(sp.lote) ? Number(sp.lote) : undefined;
  const kitFiltro = typeof sp.kit === "string" ? sp.kit : undefined;
  const [camp, criadoras] = await Promise.all([
    prisma.campanha.findUnique({ where: { id }, include: { tarefas: { orderBy: { posicao: "asc" } } } }),
    listarCriadoras({ campanhaId: id }),
  ]);
  if (!camp) notFound();

  const ativas = criadoras.filter((c) => c.status !== "descartada" && c.status !== "nao_seguiu" && c.kit?.toLowerCase() !== "reserva");
  const etapas = ativas.map(etapaPosFechar);
  const investido = criadoras.reduce((a, c) => a + investimento(c).total, 0);
  const vendas = criadoras.reduce((a, c) => a + (c.cupomVendas?.toNumber() ?? 0), 0);
  const pedidos = criadoras.reduce((a, c) => a + (c.cupomPedidos ?? 0), 0);
  const feitas = camp.tarefas.filter((t) => t.feita).length;
  const kits = new Map<string, number>();
  for (const c of ativas) if (c.kit) kits.set(c.kit, (kits.get(c.kit) ?? 0) + 1);

  const estimativa = estimativaDaOnda(ativas.map((c) => c.kit));
  const lotes = [...new Set(criadoras.map((c) => c.lote).filter((l): l is number => l !== null && l > 0))].sort((a, b) => a - b);
  const kitsDaLista = [...new Set(criadoras.map((c) => c.kit).filter((k): k is string => Boolean(k)))];
  const visiveis = criadoras.filter((c) => (loteFiltro === undefined || c.lote === loteFiltro) && (!kitFiltro || c.kit === kitFiltro));
  const grupos = STATUS.map((s) => ({ ...s, lista: visiveis.filter((c) => c.status === s.valor).sort((a, b) => (a.lote ?? 9) - (b.lote ?? 9)) })).filter((g) => g.lista.length);
  const base = `/marketing/parcerias/campanhas/${camp.id}`;
  const filtroHref = (mudar: { lote?: number | null; kit?: string | null }) => {
    const p = new URLSearchParams();
    const lote = mudar.lote === undefined ? loteFiltro : mudar.lote;
    const kit = mudar.kit === undefined ? kitFiltro : mudar.kit;
    if (lote) p.set("lote", String(lote));
    if (kit) p.set("kit", kit);
    return p.size ? `${base}?${p}` : base;
  };
  const pilula = (ativa: boolean) => `rounded-full px-3 py-1 text-xs font-semibold ${ativa ? "bg-accent text-accent-ink" : "border border-border text-muted hover:text-ink"}`;

  return (
    <div className="space-y-6">
      <Link href="/marketing/parcerias/campanhas" className="text-xs text-muted hover:text-ink">
        ← Todas as campanhas
      </Link>
      <h2 className="font-serif text-2xl font-semibold text-ink sm:text-3xl">{camp.nome}</h2>
      <EditorCampos
        url={`/api/parcerias/campanhas/${camp.id}`}
        campos={[
          { chave: "nome", rotulo: "Nome", valor: camp.nome, largura: "media" },
          { chave: "inicio", rotulo: "Início", tipo: "data", valor: dataISO(camp.inicio), exibicao: camp.inicio && dataBR.format(camp.inicio), largura: "media" },
          { chave: "fim", rotulo: "Fim", tipo: "data", valor: dataISO(camp.fim), exibicao: camp.fim && dataBR.format(camp.fim), largura: "media" },
          { chave: "descricao", rotulo: "Objetivo", tipo: "area", valor: camp.descricao ?? "" },
        ]}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="font-serif text-xl font-semibold tabular-nums text-ink">{ativas.length}</p>
          <p className="text-xs text-muted">{[...kits].map(([k, n]) => `${n} ${k}`).join(" + ") || "criadoras ativas"}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="font-serif text-xl font-semibold tabular-nums text-ink">
            {etapas.filter((e) => e && e !== "Falta enviar").length} · {etapas.filter((e) => e === "Postou" || e === "Vendeu").length} ·{" "}
            {etapas.filter((e) => e === "Vendeu").length}
          </p>
          <p className="text-xs text-muted">enviados · postaram · venderam</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="font-serif text-xl font-semibold tabular-nums text-ink">{formatarReais(investido)}</p>
          <p className="text-xs text-muted">
            investido (produtos, frete, cachê)
            {estimativa && ` · estimativa da onda ${formatarReais(estimativa.min)}–${formatarReais(estimativa.max)}`}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="font-serif text-xl font-semibold tabular-nums text-ink">{formatarReais(vendas)}</p>
          <p className="text-xs text-muted">{pedidos} pedidos com os cupons</p>
        </div>
      </div>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-serif text-xl font-semibold text-ink">O que fazer</h3>
          {camp.tarefas.length > 0 && (
            <span className="text-xs tabular-nums text-muted">
              {feitas} de {camp.tarefas.length} feitas
            </span>
          )}
        </div>
        <Tarefas campanhaId={camp.id} tarefas={camp.tarefas} />
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-serif text-xl font-semibold text-ink">Criadoras da campanha</h3>
          <Link href="/marketing/parcerias/producao" className="text-xs font-semibold text-ink underline">
            Produção dos envios →
          </Link>
        </div>
        {(lotes.length > 0 || kitsDaLista.length > 0) && (
          <div className="flex flex-wrap items-center gap-2">
            <Link href={filtroHref({ lote: null, kit: null })} className={pilula(loteFiltro === undefined && !kitFiltro)}>
              Todas
            </Link>
            {lotes.map((l) => (
              <Link key={l} href={filtroHref({ lote: loteFiltro === l ? null : l })} className={pilula(loteFiltro === l)}>
                Lote {l}
              </Link>
            ))}
            {kitsDaLista.map((k) => (
              <Link key={k} href={filtroHref({ kit: kitFiltro === k ? null : k })} className={pilula(kitFiltro === k)}>
                {k}
              </Link>
            ))}
          </div>
        )}
        {grupos.length === 0 && (
          <p className="text-sm text-muted">Nenhuma ainda. Na ficha de cada criadora, em &quot;Campanha e acordo&quot;, escolha esta campanha.</p>
        )}
        {grupos.map((g) => (
          <div key={g.valor} className="space-y-1">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">
              {g.rotulo} ({g.lista.length})
            </h4>
            <ul className="divide-y divide-border border-y border-border">
              {g.lista.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                  <Link href={`/marketing/parcerias/criadoras/${c.id}`} className="font-semibold text-ink hover:underline">
                    {nomeExibicao(c)}
                  </Link>
                  <span className="text-xs text-muted">
                    {[c.lote && `Lote ${c.lote}`, c.kit, c.seguidoresInstagram && `${formatarSeguidores(c.seguidoresInstagram)} seg.`, etapaPosFechar(c)].filter(Boolean).join(" · ")}
                  </span>
                  <span className="ml-auto">
                    <StatusSelect criadoraId={c.id} status={c.status} compacto />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h3 className="font-serif text-xl font-semibold text-ink">Combinados com toda criadora</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {COMBINADOS.map((c) => (
            <div key={c.titulo} className="border-l-2 border-ok pl-3">
              <h4 className="text-sm font-semibold text-ink">{c.titulo}</h4>
              <p className="text-sm text-muted">{c.texto}</p>
            </div>
          ))}
        </div>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          {DICAS_DE_DM.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </section>

      <BotaoAcao
        url={`/api/parcerias/campanhas/${camp.id}`}
        method="DELETE"
        rotulo="Excluir campanha"
        confirmar="Excluir a campanha e as tarefas? (as criadoras continuam)"
        irPara="/marketing/parcerias/campanhas"
        className="text-xs text-muted underline hover:text-alerta"
      />
    </div>
  );
}
