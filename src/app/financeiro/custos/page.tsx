import Link from "next/link";
import { getCustosFixos, getDespesasVariaveis } from "@/lib/financeiro/queries";
import { carregarParametros } from "@/lib/financeiro/precificacao";
import { formatarReais, paraCampo } from "@/lib/financeiro/formato";
import { ParametrosPrecificacao } from "@/components/financeiro/ParametrosPrecificacao";
import { TabelaEditavel } from "@/components/financeiro/TabelaEditavel";
import { CATEGORIAS_FIXOS, NOMES_CATEGORIAS, categoriaFixo } from "@/lib/financeiro/categorias";

export const dynamic = "force-dynamic";

const pct = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

export default async function CustosPage() {
  const [custosDb, despesas, p] = await Promise.all([getCustosFixos(), getDespesasVariaveis(), carregarParametros()]);

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
        <p className="text-xs uppercase tracking-wide text-background/60">Markup</p>
        <p className="font-serif text-3xl font-semibold">
          {p.markup !== null ? `${p.markup.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}×` : "—"}
        </p>
        <p className="mt-1 text-sm text-background/80">
          Preço sugerido = (custo do produto + embalagem de envio por produto) × markup
        </p>
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
            Falta o faturamento médio: sem ele os custos fixos ainda não entram no preço sugerido.
          </p>
        )}
        {p.markup === null && (
          <p className="mt-3 text-xs text-accent">
            Custos fixos + despesas + lucro passam de 100% do preço: não existe preço que feche essa conta. Revise os
            valores.
          </p>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="font-serif text-xl font-semibold text-ink">Faturamento e lucro</h2>
        <p className="max-w-2xl text-sm text-muted">
          Os custos fixos viram um percentual do faturamento: se você fatura R$ 6.000 e tem R$ 1.500 de fixos, cada
          venda precisa reservar 25% do preço pra pagar esses fixos.
        </p>
        <ParametrosPrecificacao faturamentoMensal={p.faturamentoMensal} lucroDesejado={p.lucroPct} />
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
