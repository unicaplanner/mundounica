import { getCustosFixos, getDespesasVariaveis } from "@/lib/financeiro/queries";
import { carregarParametros } from "@/lib/financeiro/precificacao";
import { formatarReais, paraCampo } from "@/lib/financeiro/formato";
import { ParametrosPrecificacao } from "@/components/financeiro/ParametrosPrecificacao";
import { TabelaEditavel } from "@/components/financeiro/TabelaEditavel";

export const dynamic = "force-dynamic";

const pct = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

const CATEGORIAS = [
  "Pró-labore",
  "Contador",
  "Plano do Shopify",
  "Apps e assinaturas",
  "Aluguel",
  "Energia",
  "Internet e telefone",
  "Marketing fixo",
  "Ajudante",
  "Outros",
];

export default async function CustosPage() {
  const [custos, despesas, p] = await Promise.all([getCustosFixos(), getDespesasVariaveis(), carregarParametros()]);

  return (
    <div className="space-y-10">
      <div className="rounded-2xl bg-ink px-6 py-5 text-background">
        <p className="text-xs uppercase tracking-wide text-background/60">Markup</p>
        <p className="font-serif text-3xl font-semibold">
          {p.markup !== null ? `${p.markup.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}×` : "—"}
        </p>
        <p className="mt-1 text-sm text-background/80">Preço sugerido = custo do produto × markup</p>
        <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
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
        <TabelaEditavel
          endpoint="/api/financeiro/custos-fixos"
          nomeItem="este custo"
          rotuloAdicionar="Adicionar custo fixo"
          textoVazio="Nenhum custo fixo cadastrado ainda. Comece pelo pró-labore."
          campos={[
            { chave: "nome", rotulo: "Nome", placeholder: "Contador", largura: "w-44" },
            { chave: "categoria", rotulo: "Categoria", placeholder: "Contador", largura: "w-40", sugestoes: CATEGORIAS },
            { chave: "valorMensal", rotulo: "Valor por mês (R$)", placeholder: "350,00", numerico: true },
          ]}
          linhas={custos.map((c) => ({
            id: c.id,
            nome: c.nome,
            valores: { nome: c.nome, categoria: c.categoria, valorMensal: paraCampo(c.valorMensal.toNumber(), 2) },
            exibir: {
              nome: <span className="font-semibold text-ink">{c.nome}</span>,
              categoria: <span className="text-muted">{c.categoria}</span>,
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
