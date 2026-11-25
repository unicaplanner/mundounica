import Link from "next/link";
import { prisma } from "@/lib/db";
import { EditarCampanha, NovaCampanha, NovaData, TirarData } from "@/components/marketing/CampanhasEditor";
import { carregarFila } from "@/lib/marketing/alertas";
import { lerPrazosRegiao, preencher, resumoCampanha } from "@/lib/marketing/campanhas";
import { dataCurta, diaISO } from "@/lib/marketing/datas";

export const dynamic = "force-dynamic";

const TIPO_DATA: Record<string, string> = { marca: "Da marca", pico: "Pico de busca", sazonal: "Sazonal", recesso: "Recesso", feriado: "Feriado" };
const ehDia = (d: Date | null) => (d ? diaISO(d) : "");
const num = (v: unknown) => (v == null ? "" : String(v));

export default async function CampanhasPage({ searchParams }: PageProps<"/marketing/campanhas">) {
  const sp = await searchParams;
  const verArquivadas = sp.arquivadas === "1";
  const [campanhas, datas, fila] = await Promise.all([
    prisma.mktCampanha.findMany({
      where: verArquivadas ? {} : { arquivadoEm: null },
      orderBy: [{ inicio: "asc" }, { nome: "asc" }],
      include: {
        conteudos: {
          where: { arquivadoEm: null },
          orderBy: { data: "asc" },
          select: { id: true, data: true, titulo: true, formato: true, legenda: true, cta: true, roteiro: true, status: true },
        },
      },
    }),
    prisma.mktData.findMany({ orderBy: { inicio: "asc" } }),
    carregarFila().catch(() => null),
  ]);
  const prazoFila = fila?.prazoRealDiasUteis ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-serif text-2xl font-semibold text-ink">Campanhas e datas</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Os dados de cada oferta ficam aqui, num lugar só. Os posts ligados à campanha trocam sozinhos os marcadores [OFERTA],
          [DESCONTO], [QTD], [BRINDE], [CUPOM], [FRETE], [DATA], [ÚLTIMO DIA] e [PRAZO] pelos valores daqui, e avisam o que ainda
          falta preencher.
        </p>
        {fila && (
          <p className="mt-2 text-sm text-ink">
            Prazo real da produção hoje: <strong>{fila.prazoRealDiasUteis} dias úteis</strong> ({fila.abertos} pedidos abertos,{" "}
            {fila.atrasados} atrasados).
          </p>
        )}
      </div>

      <NovaCampanha prazoFilaDias={prazoFila} />

      {campanhas.map((c) => {
        const regioes = lerPrazosRegiao(c.prazosRegiao);
        const faltandoPorPost = c.conteudos
          .map((p) => ({ p, faltando: preencher(`${p.legenda ?? ""}\n${p.cta ?? ""}\n${JSON.stringify(p.roteiro ?? "")}`, resumoCampanha(c), prazoFila).faltando }))
          .filter((x) => x.faltando.length);
        return (
          <section key={c.id} className={`flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5 ${c.arquivadoEm ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-serif text-xl font-semibold text-ink">{c.nome}</h3>
              <span className="text-sm text-muted">
                {c.inicio ? dataCurta(c.inicio) : "sem início"} – {c.fim ? dataCurta(c.fim) : "sem fim"}
              </span>
            </div>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {[
                ["Oferta", c.oferta],
                ["Desconto", c.descontoPct != null ? `${Number(c.descontoPct)}%` : null],
                ["Cupom", c.cupom],
                ["Brinde", c.brinde ? `${c.brinde}${c.brindeQtd ? ` (${c.brindeQtd})` : ""}` : null],
                ["Lote", c.quantidade != null ? String(c.quantidade) : null],
                ["Frete grátis acima de", c.freteGratisAcima != null ? `R$ ${Number(c.freteGratisAcima)}` : null],
                ["Prazo de produção", `${c.prazoProducaoDias ?? prazoFila ?? "?"} dias úteis${c.prazoProducaoDias ? "" : " (da fila)"}`],
                ["Último dia pra pedir", c.ultimoDiaPedido ? dataCurta(c.ultimoDiaPedido) : regioes.map((r) => `${r.regiao} ${dataCurta(r.ultimoDia)}`).join(" · ") || null],
              ].map(([k, val]) => (
                <div key={k} className="flex gap-2">
                  <dt className="shrink-0 text-muted">{k}:</dt>
                  <dd className={val ? "text-ink" : "text-atencao"}>{val || "a preencher"}</dd>
                </div>
              ))}
            </dl>
            {c.produtos && <p className="text-sm whitespace-pre-line text-ink">{c.produtos}</p>}

            <div className="flex flex-col gap-1">
              <h4 className="text-xs font-semibold tracking-wide text-muted uppercase">Posts da campanha ({c.conteudos.length})</h4>
              {c.conteudos.length ? (
                <ul className="flex flex-col gap-1 text-sm">
                  {c.conteudos.map((p) => (
                    <li key={p.id}>
                      <Link href={`/marketing/conteudo/${p.id}`} className="text-ink underline">
                        {dataCurta(p.data)} · {p.titulo}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Nenhum post ligado ainda. Ligue pela ficha do post (Editar › Campanha).</p>
              )}
            </div>
            {faltandoPorPost.length > 0 && (
              <div className="rounded-xl bg-atencao-soft p-3 text-sm text-ink">
                <p className="font-semibold text-atencao">Ainda falta preencher</p>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {faltandoPorPost.map(({ p, faltando }) => (
                    <li key={p.id}>
                      {dataCurta(p.data)} · {p.titulo}: {faltando.join(", ")}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <EditarCampanha
              id={c.id}
              arquivada={!!c.arquivadoEm}
              prazoFilaDias={prazoFila}
              inicial={{
                nome: c.nome,
                descricao: c.descricao,
                oferta: c.oferta,
                descontoPct: num(c.descontoPct),
                cupom: c.cupom,
                brinde: c.brinde,
                brindeQtd: num(c.brindeQtd),
                quantidade: num(c.quantidade),
                freteGratisAcima: num(c.freteGratisAcima),
                produtos: c.produtos,
                inicio: ehDia(c.inicio),
                fim: ehDia(c.fim),
                prazoProducaoDias: num(c.prazoProducaoDias),
                ultimoDiaPedido: ehDia(c.ultimoDiaPedido),
                prazosRegiao: regioes,
              }}
            />
          </section>
        );
      })}

      <Link href={verArquivadas ? "/marketing/campanhas" : "/marketing/campanhas?arquivadas=1"} className="self-start text-xs text-muted underline">
        {verArquivadas ? "Esconder as arquivadas" : "Ver também as campanhas arquivadas"}
      </Link>

      <section className="flex flex-col gap-3">
        <h3 className="font-serif text-xl font-semibold text-ink">Datas da marca</h3>
        <p className="text-sm text-muted">Aparecem no calendário, no dia (ou na faixa de dias).</p>
        <ul className="flex flex-col gap-2">
          {datas.map((d) => (
            <li key={d.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl border border-border bg-card px-3 py-2 text-sm">
              <span className="font-semibold text-ink">{d.titulo}</span>
              <span className="text-muted">
                {dataCurta(d.inicio)}
                {d.fim && ` – ${dataCurta(d.fim)}`}
                {d.recorrente && " · todo ano"} · {TIPO_DATA[d.tipo] ?? d.tipo}
              </span>
              {d.nota && <span className="basis-full text-xs text-muted">{d.nota}</span>}
              <span className="ml-auto">
                <TirarData id={d.id} />
              </span>
            </li>
          ))}
        </ul>
        <NovaData />
      </section>
    </div>
  );
}
