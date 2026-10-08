import Link from "next/link";
import { getCustosFixos, getDespesasVariaveis } from "@/lib/financeiro/queries";
import { carregarParametros } from "@/lib/financeiro/precificacao";
import { formatarReais, paraCampo } from "@/lib/financeiro/formato";
import { ParametrosPrecificacao } from "@/components/financeiro/ParametrosPrecificacao";
import { TabelaEditavel } from "@/components/financeiro/TabelaEditavel";
import { MetasMargem } from "@/components/financeiro/MetasMargem";
import { MedidorMei } from "@/components/financeiro/MedidorMei";
import { carregarMei } from "@/lib/financeiro/mei";
import { markup } from "@/lib/financeiro/analise";
import { CATEGORIAS_FIXOS, NOMES_CATEGORIAS, categoriaFixo } from "@/lib/financeiro/categorias";

export const dynamic = "force-dynamic";

const pct = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

export default async function CustosPage() {
  const [custosDb, despesas, p, mei] = await Promise.all([getCustosFixos(), getDespesasVariaveis(), carregarParametros(), carregarMei()]);

  // agrupados por categoria (na ordem da lista), maiores primeiro dentro de cada uma
  const ordem = (cat: string) => NOMES_CATEGORIAS.indexOf(cat);
  const custos = custosDb
    .map((c) => ({ ...c, cat: categoriaFixo(c.categoria) }))
    .sort((a, b) => ordem(a.cat) - ordem(b.cat) || b.valorMensal.comparedTo(a.valorMensal));
  const porCategoria = CATEGORIAS_FIXOS.map((cat) => ({
    ...cat,
    total: custos.filter((c) => c.cat === cat.nome).reduce((acc, c) => acc + c.valorMensal.toNumber(), 0),
  })).filter((c) => c.total > 0);

  return (
    <div className="space-y-10">
      <div className="rounded-2xl bg-ink px-6 py-5 text-background">
        <p className="text-xs uppercase tracking-wide text-background/60">Metas de margem de contribuição</p>
        <p className="mt-1 max-w-2xl text-sm text-background/80">
          Margem de contribuição é o que sobra de cada venda depois do custo do produto, da embalagem de envio, das taxas
          e do imposto. A soma delas paga os custos fixos e dá o lucro. Cada tipo tem a sua meta: a revenda, com preço
          ditado pelo mercado, fica com menos; a produção própria compensa.
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          {(
            [
              ["Produção própria", p.margens.producao_propria],
              ["Kit", p.margens.kit],
              ["Revenda", p.margens.revenda],
            ] as const
          ).map(([nome, meta]) => {
            const m = markup(p, meta);
            return (
              <div key={nome}>
                <dt className="text-xs text-background/60">{nome}</dt>
                <dd className="font-serif text-2xl font-semibold">{pct(meta)}</dd>
                <dd className="text-xs text-background/70">
                  {m !== null
                    ? `preço = (custo + envio) × ${m.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`
                    : "meta + despesas passam de 100%"}
                </dd>
              </div>
            );
          })}
        </dl>
        <div className="mt-4">
          <MetasMargem
            margemProducao={p.margens.producao_propria}
            margemKit={p.margens.kit}
            margemRevenda={p.margens.revenda}
          />
        </div>
        {p.fixosPct !== null && (
          <p className="mt-4 text-xs text-background/80">
            Pra pagar os custos fixos ({pct(p.fixosPct)} do faturamento médio) e ter {pct(p.lucroPct)} de lucro, o
            conjunto das vendas precisa deixar, em média, <strong>{pct(p.fixosPct + p.lucroPct)}</strong> de margem de
            contribuição. Veja se está fechando na aba{" "}
            <Link href="/financeiro/precificacao" className="underline">
              Precificação
            </Link>
            .
          </p>
        )}
        <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-4">
          <div>
            <dt className="text-background/60">Custos fixos</dt>
            <dd className="font-semibold">
              {p.fixosPct !== null ? pct(p.fixosPct) : "—"}
              <span className="font-normal text-background/70"> · {formatarReais(p.totalFixos)}/mês</span>
            </dd>
          </div>
          <div>
            <dt className="text-background/60">Despesas por venda</dt>
            <dd className="font-semibold">{pct(p.despesasPct)}</dd>
          </div>
          <div>
            <dt className="text-background/60">
              <Link href="/financeiro/envio" className="underline">
                Embalagem de envio
              </Link>
            </dt>
            <dd className="font-semibold">
              {p.envioPorProduto > 0 ? `${formatarReais(p.envioPorProduto)}/produto` : "—"}
              {p.custoMedioEnvio !== null && p.itensPorPedido && (
                <span className="block font-normal text-background/70">
                  {formatarReais(p.custoMedioEnvio)}/pedido ÷ {p.itensPorPedido.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} produtos
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-background/60">Lucro desejado</dt>
            <dd className="font-semibold">{pct(p.lucroPct)}</dd>
          </div>
        </dl>
        {p.fixosPct === null && (
          <p className="mt-3 text-xs text-accent">
            Falta o faturamento médio: sem ele não dá pra saber se as vendas estão pagando os custos fixos.
          </p>
        )}
      </div>

      <MedidorMei mei={mei} temSimples={despesas.some((d) => d.nome.toLowerCase().includes("simples"))} />

      <section className="space-y-3">
        <h2 className="font-serif text-xl font-semibold text-ink">Faturamento, lucro e mão de obra</h2>
        <p className="max-w-2xl text-sm text-muted">
          Os custos fixos são pagos pela soma do que as vendas deixam: se você fatura R$ 6.000 e tem R$ 1.500 de fixos,
          as vendas somadas precisam deixar 25% do faturamento. Não é cobrado igual de cada produto: a revenda deixa menos e
          a produção própria compensa.
        </p>
        <ParametrosPrecificacao faturamentoMensal={p.faturamentoMensal} lucroDesejado={p.lucroPct} valorHora={p.valorHora} />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-xl font-semibold text-ink">Custos fixos por mês</h2>
          <p className="text-sm text-muted">
            Total: <span className="font-semibold text-ink">{formatarReais(p.totalFixos)}</span>
          </p>
        </div>
        <p className="max-w-2xl text-sm text-muted">
          O que você paga todo mês, vendendo ou não. Inclua o <strong>pró-labore</strong> que você quer tirar: assim o
          preço já nasce pagando o seu salário. Se algo é anual, divida por 12. Não inclua material nem impressora:
          eles já entram no custo de cada produto.
        </p>
        {porCategoria.length > 0 && (
          <ul className="grid gap-2 sm:grid-cols-2">
            {porCategoria.map((c) => {
              const parte = p.totalFixos > 0 ? (c.total / p.totalFixos) * 100 : 0;
              return (
                <li key={c.nome} className="rounded-xl border border-border bg-card px-4 py-2.5">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-semibold text-ink">{c.nome}</span>
                    <span className="tabular-nums text-ink">
                      {formatarReais(c.total)} <span className="text-xs text-muted">· {pct(parte)}</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-accent-soft" aria-hidden="true">
                    <div className="h-full rounded-full bg-ink/70" style={{ width: `${parte}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <details className="text-xs text-muted">
          <summary className="cursor-pointer">O que entra em cada categoria</summary>
          <ul className="mt-2 space-y-0.5">
            {CATEGORIAS_FIXOS.map((c) => (
              <li key={c.nome}>
                <strong className="text-ink">{c.nome}</strong>: {c.exemplos}
              </li>
            ))}
          </ul>
        </details>
        <TabelaEditavel
          endpoint="/api/financeiro/custos-fixos"
          nomeItem="este custo"
          rotuloAdicionar="Adicionar custo fixo"
          textoVazio="Nenhum custo fixo cadastrado ainda. Comece pelo pró-labore."
          campos={[
            { chave: "nome", rotulo: "Nome", placeholder: "Contador", largura: "w-44" },
            { chave: "categoria", rotulo: "Categoria", largura: "w-48", opcoes: NOMES_CATEGORIAS },
            { chave: "valorMensal", rotulo: "Valor por mês (R$)", placeholder: "350,00", numerico: true },
          ]}
          linhas={custos.map((c) => ({
            id: c.id,
            nome: c.nome,
            valores: { nome: c.nome, categoria: c.cat, valorMensal: paraCampo(c.valorMensal.toNumber(), 2) },
            exibir: {
              nome: <span className="font-semibold text-ink">{c.nome}</span>,
              categoria: <span className="text-muted">{c.cat}</span>,
              valorMensal: formatarReais(c.valorMensal.toNumber()),
            },
          }))}
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-xl font-semibold text-ink">Despesas por venda</h2>
        <p className="max-w-2xl text-sm text-muted">
          Percentuais que saem de cada venda: imposto do Simples (a alíquota efetiva, seu contador sabe), taxa de cartão
          ou do Shopify Payments, comissões.
        </p>
        <TabelaEditavel
          endpoint="/api/financeiro/despesas-variaveis"
          nomeItem="esta despesa"
          rotuloAdicionar="Adicionar despesa por venda"
          textoVazio="Nenhuma despesa por venda cadastrada ainda."
          campos={[
            {
              chave: "nome",
              rotulo: "Nome",
              placeholder: "Simples Nacional",
              largura: "w-56",
              sugestoes: ["Simples Nacional", "Taxa de cartão / Shopify Payments", "Taxa do gateway", "Comissão"],
            },
            { chave: "percentual", rotulo: "% sobre o preço", placeholder: "6", numerico: true, largura: "w-24" },
          ]}
          linhas={despesas.map((d) => ({
            id: d.id,
            nome: d.nome,
            valores: { nome: d.nome, percentual: paraCampo(d.percentual.toNumber()) },
            exibir: {
              nome: <span className="font-semibold text-ink">{d.nome}</span>,
              percentual: pct(d.percentual.toNumber()),
            },
          }))}
        />
      </section>
    </div>
  );
}
