import Link from "next/link";
import { carregarCustos, nomeVariante } from "@/lib/financeiro/custo";
import { carregarParametros } from "@/lib/financeiro/precificacao";
import { carregarVendas } from "@/lib/financeiro/vendas";
import {
  ROTULO_TIPO,
  analisarPreco,
  metaDoTipo,
  precoSugerido,
  type AnalisePreco,
  type StatusPreco as Status,
  type TipoComMeta,
} from "@/lib/financeiro/analise";
import { formatarReais, normalizarBusca } from "@/lib/financeiro/formato";
import { StatusPreco } from "@/components/financeiro/StatusPreco";
import { AlertasMateriais } from "@/components/financeiro/AlertasMateriais";
import { carregarAlertasMateriais } from "@/lib/financeiro/alertas";
import { botaoSecundario, campo } from "@/components/financeiro/estilos";

export const dynamic = "force-dynamic";

type Filtro = Status | "sem_custo" | "todos";
const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "prejuizo", rotulo: "Prejuízo" },
  { valor: "abaixo_meta", rotulo: "Abaixo da meta" },
  { valor: "ok", rotulo: "Na meta" },
  { valor: "sem_custo", rotulo: "Sem custo ou preço" },
];
const LIMITE = 200;

type Linha = {
  chave: string;
  produtoId: string;
  rotulo: string;
  tipo: TipoComMeta;
  custo: number | null;
  incompleto: boolean;
  preco: number | null;
  sugerido: number | null;
  analise: AnalisePreco | null;
};

const pct = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

export default async function PrecificacaoPage({ searchParams }: PageProps<"/financeiro/precificacao">) {
  const sp = await searchParams;
  const busca = typeof sp.busca === "string" ? sp.busca.trim() : "";
  const filtro = (FILTROS.find((f) => f.valor === sp.filtro)?.valor ?? "todos") as Filtro;
  const [custos, p, vendas] = await Promise.all([carregarCustos(), carregarParametros(), carregarVendas()]);
  const alertas = await carregarAlertasMateriais(custos, p);

  const linhas: Linha[] = [];
  for (const produto of custos.produtos.values()) {
    if (!produto.tipo || produto.tipo === "ignorar") continue;
    const tipo = produto.tipo as TipoComMeta;
    const meta = metaDoTipo(p, tipo);
    for (const v of produto.variantes.filter((x) => x.ativa)) {
      const custo = custos.daVariante(v.id);
      const custoNum = custo ? custo.valor.toNumber() : null;
      const preco = v.preco ? v.preco.toNumber() : null;
      linhas.push({
        chave: v.id,
        produtoId: produto.id,
        rotulo: nomeVariante(produto.title, v.title),
        tipo,
        custo: custoNum,
        incompleto: custo?.incompleto ?? false,
        preco,
        sugerido: custoNum !== null ? precoSugerido(custoNum, p, meta) : null,
        analise: custoNum !== null && preco !== null ? analisarPreco(custoNum, preco, p, meta) : null,
      });
    }
  }

  // Cobertura dos custos fixos pelas vendas reais dos ultimos 12 meses: cada
  // venda deixa uma margem de contribuicao; a soma delas e que paga os fixos.
  let receitaComCusto = 0;
  let margemGerada = 0;
  for (const [varianteId, venda] of vendas.porVariante) {
    const v = custos.variantes.get(varianteId);
    const tipo = v ? custos.produtos.get(v.produtoId)?.tipo : null;
    if (!v || !tipo || tipo === "ignorar") continue;
    const custo = custos.daVariante(varianteId);
    if (!custo) continue;
    receitaComCusto += venda.receita;
    margemGerada +=
      venda.receita - venda.quantidade * (custo.valor.toNumber() + p.envioPorProduto) - (venda.receita * p.despesasPct) / 100;
  }
  const margemMediaPct = receitaComCusto > 0 ? (margemGerada / receitaComCusto) * 100 : null;
  const fixosAno = p.totalFixos * 12;
  const necessariaPct = p.fixosPct !== null ? p.fixosPct + p.lucroPct : null;
  const cobertura = vendas.total > 0 ? (receitaComCusto / vendas.total) * 100 : 0;
  // projecao: o resto das vendas com a mesma margem media
  const margemEstimadaAno = margemMediaPct !== null ? (vendas.total * margemMediaPct) / 100 : null;
  const resultadoAno = margemEstimadaAno !== null ? margemEstimadaAno - fixosAno : null;
  const pontoEquilibrio = margemMediaPct && margemMediaPct > 0 ? p.totalFixos / (margemMediaPct / 100) : null;

  const contagem = { prejuizo: 0, abaixo_meta: 0, ok: 0, sem_custo: 0 };
  for (const l of linhas) contagem[l.analise ? l.analise.status : "sem_custo"] += 1;

  const termo = normalizarBusca(busca);
  const folga = (l: Linha) => (l.analise ? l.analise.contribuicaoPct - l.analise.meta : Infinity);
  const visiveis = linhas
    .filter((l) => (filtro === "todos" ? true : filtro === "sem_custo" ? !l.analise : l.analise?.status === filtro))
    .filter((l) => !termo || normalizarBusca(l.rotulo).includes(termo))
    .sort((a, b) => folga(a) - folga(b) || a.rotulo.localeCompare(b.rotulo, "pt-BR"));

  const link = (f: Filtro) => {
    const q = new URLSearchParams({ filtro: f });
    if (busca) q.set("busca", busca);
    return `/financeiro/precificacao?${q}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3 text-sm text-muted">
        <p>
          Metas de margem de contribuição: produção própria{" "}
          <span className="font-semibold text-ink">{pct(p.margens.producao_propria)}</span> · kit{" "}
          <span className="font-semibold text-ink">{pct(p.margens.kit)}</span> · revenda{" "}
          <span className="font-semibold text-ink">{pct(p.margens.revenda)}</span>
        </p>
        <Link href="/financeiro/custos" className="text-xs text-ink underline">
          Ajustar metas e custos
        </Link>
      </div>

      <AlertasMateriais alertas={alertas} />

      <section className="space-y-3 rounded-2xl bg-ink px-6 py-5 text-background">
        <p className="text-xs uppercase tracking-wide text-background/60">Os custos fixos estão sendo pagos?</p>
        {margemMediaPct === null ? (
          <p className="text-sm text-background/80">
            Assim que os produtos mais vendidos tiverem custo, aqui aparece quanto as suas vendas deixam pra pagar os
            custos fixos de {formatarReais(p.totalFixos)} por mês.
          </p>
        ) : (
          <>
            <p className="text-sm text-background/90">
              Nos últimos 12 meses, os produtos com custo cadastrado ({pct(cobertura)} das vendas) deixaram, em média,{" "}
              <strong className="font-serif text-2xl">{pct(margemMediaPct)}</strong> de margem de contribuição.
            </p>
            <dl className="grid gap-3 text-xs sm:grid-cols-3">
              <div>
                <dt className="text-background/60">Precisa, em média</dt>
                <dd className="font-semibold">
                  {necessariaPct !== null ? pct(necessariaPct) : "—"}
                  {p.fixosPct !== null && (
                    <span className="block font-normal text-background/70">
                      fixos {pct(p.fixosPct)} + lucro {pct(p.lucroPct)}
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-background/60">Se todas as vendas seguirem essa média</dt>
                <dd className="font-semibold">
                  {resultadoAno !== null && (
                    <>
                      {resultadoAno >= 0 ? "sobra " : "faltam "}
                      {formatarReais(Math.abs(resultadoAno))} no ano
                      <span className="block font-normal text-background/70">
                        depois de {formatarReais(fixosAno)} de custos fixos
                      </span>
                    </>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-background/60">Ponto de equilíbrio</dt>
                <dd className="font-semibold">
                  {pontoEquilibrio !== null ? `${formatarReais(pontoEquilibrio)} por mês` : "—"}
                  <span className="block font-normal text-background/70">faturamento que só paga os fixos, sem lucro</span>
                </dd>
              </div>
            </dl>
            {cobertura < 80 && (
              <p className="text-xs text-accent">
                Ainda é uma estimativa: {pct(100 - cobertura)} das vendas são de produtos sem custo. Cadastre os mais
                vendidos pra conta ficar firme.
              </p>
            )}
          </>
        )}
        <p className="text-xs text-background/70">
          Os custos fixos não são cobrados produto a produto: quem paga é a soma do que todas as vendas deixam. Por isso a
          revenda (preço ditado pelo mercado) tem meta menor e a produção própria compensa.
        </p>
      </section>

      {linhas.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted">
          Nenhum produto classificado ainda. Classifique e monte o custo dos produtos na aba{" "}
          <Link href="/financeiro" className="text-ink underline">
            Produtos
          </Link>
          .
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                ["prejuizo", "Prejuízo", "bg-alerta-soft text-alerta"],
                ["abaixo_meta", "Abaixo da meta", "bg-atencao-soft text-atencao"],
                ["ok", "Na meta", "bg-ok-soft text-ok"],
                ["sem_custo", "Sem custo ou preço", "bg-accent-soft text-muted"],
              ] as const
            ).map(([chave, rotulo, cor]) => (
              <Link key={chave} href={link(chave)} className={`rounded-2xl px-4 py-3 ${cor} hover:opacity-90`}>
                <p className="text-xs font-semibold">{rotulo}</p>
                <p className="font-serif text-2xl font-semibold tabular-nums">{contagem[chave]}</p>
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <form method="get" action="/financeiro/precificacao" className="flex flex-wrap items-center gap-2">
              <label htmlFor="busca-preco" className="sr-only">
                Buscar produto
              </label>
              <input id="busca-preco" type="search" name="busca" defaultValue={busca} placeholder="Buscar produto..." className={`${campo} w-56`} />
              <input type="hidden" name="filtro" value={filtro} />
              <button type="submit" className={botaoSecundario}>
                Buscar
              </button>
            </form>
            <div className="flex flex-wrap gap-2 sm:ml-auto">
              {FILTROS.map((f) => (
                <Link
                  key={f.valor}
                  href={link(f.valor)}
                  aria-current={filtro === f.valor ? "page" : undefined}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    filtro === f.valor ? "bg-ink text-background" : "bg-accent-soft text-ink/70 hover:bg-border"
                  }`}
                >
                  {f.rotulo}
                </Link>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm [&_td]:pr-4 [&_th]:pr-4">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="py-2 font-semibold">Produto</th>
                  <th className="py-2 text-right font-semibold">Custo</th>
                  <th className="py-2 text-right font-semibold">Preço no site</th>
                  <th className="py-2 text-right font-semibold">Sugerido</th>
                  <th className="py-2 text-right font-semibold">Margem/unid.</th>
                  <th className="py-2 text-right font-semibold">Margem %</th>
                  <th className="py-2 text-right font-semibold">Meta</th>
                  <th className="py-2 font-semibold">Situação</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.slice(0, LIMITE).map((l) => (
                  <tr key={l.chave} className="border-b border-border">
                    <td className="py-2.5">
                      <Link href={`/financeiro/produtos/${l.produtoId}`} className="text-ink hover:underline">
                        {l.rotulo}
                      </Link>
                      <span className="block text-[11px] text-muted">{ROTULO_TIPO[l.tipo]}</span>
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      {l.custo !== null ? (
                        <>
                          {formatarReais(l.custo)}
                          {l.incompleto && <span className="block text-[11px] text-alerta">incompleto</span>}
                        </>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">{l.preco !== null ? formatarReais(l.preco) : "—"}</td>
                    <td className="py-2.5 text-right tabular-nums text-muted">
                      {l.sugerido !== null ? formatarReais(l.sugerido) : "—"}
                    </td>
                    <td className={`py-2.5 text-right tabular-nums ${l.analise && l.analise.contribuicao < 0 ? "text-alerta" : ""}`}>
                      {l.analise ? formatarReais(l.analise.contribuicao) : "—"}
                    </td>
                    <td className="py-2.5 text-right font-semibold tabular-nums">
                      {l.analise ? pct(l.analise.contribuicaoPct) : "—"}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-muted">{pct(metaDoTipo(p, l.tipo))}</td>
                    <td className="py-2.5">
                      {l.analise ? (
                        <StatusPreco status={l.analise.status} />
                      ) : (
                        <span className="text-xs text-muted">{l.custo === null ? "sem custo" : "sem preço"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visiveis.length > LIMITE && (
            <p className="text-xs text-muted">Mostrando {LIMITE} de {visiveis.length}. Use a busca ou os filtros pra ver o resto.</p>
          )}
          <p className="text-xs text-muted">
            Margem de contribuição = preço − custo do produto − embalagem de envio − taxas e imposto. Ordenado do mais longe
            da meta pro mais acima dela.
          </p>
        </>
      )}
    </div>
  );
}
