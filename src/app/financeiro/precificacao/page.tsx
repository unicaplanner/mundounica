import Link from "next/link";
import { carregarCustos, nomeVariante } from "@/lib/financeiro/custo";
import { carregarParametros } from "@/lib/financeiro/precificacao";
import { analisarPreco, precoSugerido, type AnalisePreco, type StatusPreco as Status } from "@/lib/financeiro/analise";
import { formatarReais, normalizarBusca } from "@/lib/financeiro/formato";
import { StatusPreco } from "@/components/financeiro/StatusPreco";
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
  const [custos, p] = await Promise.all([carregarCustos(), carregarParametros()]);

  const linhas: Linha[] = [];
  for (const produto of custos.produtos.values()) {
    if (!produto.tipo || produto.tipo === "ignorar") continue;
    for (const v of produto.variantes.filter((x) => x.ativa)) {
      const custo = custos.daVariante(v.id);
      const custoNum = custo ? custo.valor.toNumber() : null;
      const preco = v.preco ? v.preco.toNumber() : null;
      linhas.push({
        chave: v.id,
        produtoId: produto.id,
        rotulo: nomeVariante(produto.title, v.title),
        custo: custoNum,
        incompleto: custo?.incompleto ?? false,
        preco,
        sugerido: custoNum !== null ? precoSugerido(custoNum, p) : null,
        analise: custoNum !== null && preco !== null ? analisarPreco(custoNum, preco, p) : null,
      });
    }
  }

  const contagem = { prejuizo: 0, abaixo_meta: 0, ok: 0, sem_custo: 0 };
  for (const l of linhas) contagem[l.analise ? l.analise.status : "sem_custo"] += 1;

  const termo = normalizarBusca(busca);
  const visiveis = linhas
    .filter((l) => (filtro === "todos" ? true : filtro === "sem_custo" ? !l.analise : l.analise?.status === filtro))
    .filter((l) => !termo || normalizarBusca(l.rotulo).includes(termo))
    .sort((a, b) => (a.analise?.lucroPct ?? Infinity) - (b.analise?.lucroPct ?? Infinity) || a.rotulo.localeCompare(b.rotulo, "pt-BR"));

  const link = (f: Filtro) => {
    const q = new URLSearchParams({ filtro: f });
    if (busca) q.set("busca", busca);
    return `/financeiro/precificacao?${q}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3 text-sm text-muted">
        <p>
          Markup{" "}
          <span className="font-semibold text-ink">
            {p.markup !== null ? `${p.markup.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}×` : "—"}
          </span>{" "}
          · fixos {p.fixosPct !== null ? pct(p.fixosPct) : "—"} · despesas por venda {pct(p.despesasPct)} · envio {formatarReais(p.envioPorProduto)}/produto · lucro desejado{" "}
          {pct(p.lucroPct)}
        </p>
        <Link href="/financeiro/custos" className="text-xs text-ink underline">
          Ajustar custos fixos e parâmetros
        </Link>
      </div>

      {p.fixosPct === null && (
        <p className="rounded-xl bg-atencao-soft px-4 py-3 text-sm text-atencao">
          Os custos fixos ainda não entram na conta porque falta o faturamento médio. Informe em{" "}
          <Link href="/financeiro/custos" className="font-semibold underline">
            Custos fixos
          </Link>
          : até lá, o lucro aparece maior do que é.
        </p>
      )}

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
            <table className="w-full min-w-[760px] text-sm [&_td]:pr-4 [&_th]:pr-4">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="py-2 font-semibold">Produto</th>
                  <th className="py-2 text-right font-semibold">Custo</th>
                  <th className="py-2 text-right font-semibold">Preço no site</th>
                  <th className="py-2 text-right font-semibold">Sugerido</th>
                  <th className="py-2 text-right font-semibold">Lucro/unid.</th>
                  <th className="py-2 text-right font-semibold">Lucro %</th>
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
                    <td className={`py-2.5 text-right tabular-nums ${l.analise && l.analise.lucro < 0 ? "text-alerta" : ""}`}>
                      {l.analise ? formatarReais(l.analise.lucro) : "—"}
                    </td>
                    <td className="py-2.5 text-right font-semibold tabular-nums">{l.analise ? pct(l.analise.lucroPct) : "—"}</td>
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
            Lucro = preço − custo do produto − despesas por venda − parte dos custos fixos. Ordenado do menor lucro pro maior.
          </p>
        </>
      )}
    </div>
  );
}
