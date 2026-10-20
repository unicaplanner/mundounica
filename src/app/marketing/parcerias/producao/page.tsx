import Link from "next/link";
import { prisma } from "@/lib/db";
import { nomeExibicao } from "@/lib/parcerias/formato";
import {
  agruparPorCriadora,
  agruparPorEtapa,
  carregarProducao,
  criadorasSemChecklist,
  respostasDeProducao,
  type ItemDeProducao,
} from "@/lib/parcerias/producao";
import { botaoPrimario, botaoSecundario } from "@/components/financeiro/estilos";
import { BotaoAcao } from "@/components/parcerias/BotaoAcao";
import { FiltroCampanha } from "@/components/parcerias/FiltroCampanha";
import { ItemProducao } from "@/components/parcerias/ItemProducao";
import { MarcarTodas } from "@/components/parcerias/MarcarTodas";

export const dynamic = "force-dynamic";

function Respostas({ item }: { item: ItemDeProducao }) {
  const respostas = respostasDeProducao(item.criadora.respostas[0]?.respostas);
  if (respostas.length === 0) return <span className="block text-xs text-atencao">Ainda não preencheu o formulário de permuta.</span>;
  return (
    <details className="mt-0.5 text-xs text-muted">
      <summary className="cursor-pointer">Ver o que ela pediu no formulário</summary>
      <dl className="mt-1 space-y-1 rounded-lg bg-accent-soft/60 p-2">
        {respostas.map((r) => (
          <div key={r.pergunta}>
            <dt className="font-semibold text-ink/80">{r.pergunta}</dt>
            <dd>{r.resposta}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

const quem = (i: ItemDeProducao) => (
  <>
    <Link href={`/marketing/parcerias/criadoras/${i.criadora.id}`} className="font-semibold text-ink hover:underline">
      {nomeExibicao(i.criadora)}
    </Link>
    {i.criadora.lote ? <span className="text-xs text-muted"> · Lote {i.criadora.lote}</span> : null}
  </>
);

export default async function ProducaoPage({ searchParams }: PageProps<"/marketing/parcerias/producao">) {
  const sp = await searchParams;
  const campanhaId = typeof sp.campanha === "string" ? sp.campanha : undefined;
  const porCriadora = sp.ver === "criadora";
  const verFeitos = sp.feitos === "1";

  const [itens, campanhas, semLista] = await Promise.all([
    carregarProducao(campanhaId),
    prisma.campanha.findMany({ select: { id: true, nome: true }, orderBy: { createdAt: "asc" } }),
    criadorasSemChecklist(campanhaId),
  ]);

  const pendentes = itens.filter((i) => !i.feito);
  const exibir = verFeitos ? itens : pendentes;
  const extra = { ver: porCriadora ? "criadora" : undefined, feitos: verFeitos ? "1" : undefined };
  const consulta = (mudar: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const todos = { ...extra, campanha: campanhaId, ...mudar };
    for (const [k, v] of Object.entries(todos)) if (v) p.set(k, v);
    const q = p.toString();
    return `/marketing/parcerias/producao${q ? `?${q}` : ""}`;
  };
  const aba = (ativa: boolean) =>
    `rounded-full px-3 py-1 text-xs font-semibold ${ativa ? "bg-ink text-background" : "bg-accent-soft text-ink/70 hover:bg-border"}`;

  const pedidoDeLista = new URLSearchParams();
  if (campanhaId) pedidoDeLista.set("campanha", campanhaId);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-serif text-2xl font-semibold text-ink">Produção dos envios</h2>
        <p className="text-sm text-muted">
          O que preparar pra cada criadora que fechou, junto por etapa pra fazer em lote: imprimir todos os blocos de uma vez, escrever os
          cartões em sequência. Marque conforme for terminando.
        </p>
      </div>

      {semLista.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-border bg-card px-4 py-3">
          <p className="text-sm text-ink">
            <b className="tabular-nums">{semLista.length}</b> {semLista.length === 1 ? "criadora fechou" : "criadoras fecharam"} e ainda{" "}
            {semLista.length === 1 ? "não tem" : "não têm"} lista de produção.
          </p>
          <BotaoAcao
            url="/api/parcerias/producao"
            body={{ acao: "gerar", campanhaId }}
            rotulo="Criar as listas"
            rotuloAndamento="Criando..."
            className={botaoPrimario}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Link href={consulta({ ver: undefined })} className={aba(!porCriadora)}>
          Por etapa
        </Link>
        <Link href={consulta({ ver: "criadora" })} className={aba(porCriadora)}>
          Por criadora
        </Link>
        <span className="mx-1 h-4 w-px bg-border" aria-hidden />
        <Link href={consulta({ feitos: verFeitos ? undefined : "1" })} className="text-xs text-muted underline">
          {verFeitos ? "Esconder o que já está feito" : "Ver também o que está feito"}
        </Link>
        <a
          href={`/imprimir/parcerias/producao${pedidoDeLista.size ? `?${pedidoDeLista}` : ""}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`${botaoSecundario} ml-auto`}
        >
          Imprimir a lista (A5)
        </a>
      </div>
      <FiltroCampanha base="/marketing/parcerias/producao" campanhas={campanhas} atual={campanhaId} extra={extra} />

      {itens.length === 0 ? (
        <p className="text-sm text-muted">
          Nada por aqui ainda. Quando uma criadora ficar como “Fechou parceria”, a lista dela aparece nesta tela.
        </p>
      ) : exibir.length === 0 ? (
        <p className="rounded-xl bg-ok-soft px-4 py-3 text-sm text-ok">Tudo pronto: {itens.length} itens feitos. 🌿</p>
      ) : porCriadora ? (
        <form action="/imprimir/parcerias/ficha" method="get" target="_blank" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <MarcarTodas />
            <button type="submit" className={botaoSecundario}>
              Imprimir as fichas marcadas (A5)
            </button>
          </div>
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {agruparPorCriadora(exibir).map(({ criadora, itens: dela }) => {
              const todos = itens.filter((i) => i.criadora.id === criadora.id);
              const feitos = todos.filter((i) => i.feito).length;
              return (
                <li key={criadora.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="mb-1 flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      name="id"
                      value={criadora.id}
                      aria-label={`Marcar ${nomeExibicao(criadora)} pra imprimir a ficha`}
                      className="mt-1 h-4 w-4 rounded border-border"
                    />
                    <div className="min-w-0 flex-1">
                      <Link href={`/marketing/parcerias/criadoras/${criadora.id}`} className="font-semibold text-ink hover:underline">
                        {nomeExibicao(criadora)}
                      </Link>
                      <span className="block text-xs text-muted">
                        {[criadora.nome, criadora.lote && `Lote ${criadora.lote}`, criadora.kit, criadora.cupom].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-muted">
                      {feitos} de {todos.length}
                    </span>
                  </div>
                  <ul className="divide-y divide-border-soft pl-6">
                    {dela.map((i) => (
                      <li key={i.id}>
                        <ItemProducao id={i.id} feito={i.feito}>
                          {i.texto}
                        </ItemProducao>
                        {i.etapa === "blocos" && !i.feito && <div className="pb-1 pl-6"><Respostas item={i} /></div>}
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        </form>
      ) : (
        <div className="space-y-5">
          {agruparPorEtapa(exibir).map((g) => {
            const todos = itens.filter((i) => i.etapa === g.valor);
            const faltam = todos.filter((i) => !i.feito).length;
            return (
              <section key={g.valor} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2">
                  <h3 className="font-serif text-lg font-semibold text-ink">{g.rotulo}</h3>
                  <span className={`text-xs font-semibold tabular-nums ${faltam === 0 ? "text-ok" : "text-muted"}`}>
                    {faltam === 0 ? "tudo feito" : `${faltam} pendente${faltam === 1 ? "" : "s"}`} · {todos.length - faltam} de {todos.length}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">{g.dica}</p>
                <ul className="mt-2 divide-y divide-border-soft">
                  {g.itens.map((i) => (
                    <li key={i.id}>
                      <ItemProducao id={i.id} feito={i.feito}>
                        {quem(i)}
                        <span className="block text-xs text-muted">{i.texto}</span>
                      </ItemProducao>
                      {g.valor === "blocos" && !i.feito && <div className="pb-1.5 pl-6"><Respostas item={i} /></div>}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
