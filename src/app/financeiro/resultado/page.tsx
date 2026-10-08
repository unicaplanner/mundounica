import Link from "next/link";
import { carregarResultados, type ResultadoMes } from "@/lib/financeiro/resultado";
import { formatarReais } from "@/lib/financeiro/formato";

export const dynamic = "force-dynamic";

const NOMES_MES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const nomeMes = (m: string, curto = false) => {
  const [ano, mes] = m.split("-");
  const nome = NOMES_MES[Number(mes) - 1];
  return curto ? `${nome.slice(0, 3)}/${ano.slice(2)}` : `${nome} de ${ano}`;
};
const pct = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`;

function Linha({ rotulo, valor, detalhe, forte, menos = true }: { rotulo: string; valor: number; detalhe?: string; forte?: boolean; menos?: boolean }) {
  return (
    <tr className={forte ? "border-t-2 border-ink/30" : "border-t border-border"}>
      <td className={`py-2 pr-3 ${forte ? "font-semibold text-ink" : ""}`}>
        {rotulo}
        {detalhe && <span className="block text-xs font-normal text-muted">{detalhe}</span>}
      </td>
      <td className={`py-2 text-right align-top tabular-nums ${forte ? "font-bold" : ""} ${valor < 0 && forte ? "text-alerta" : "text-ink"}`}>
        {menos ? "− " : ""}
        {formatarReais(menos ? Math.abs(valor) : valor)}
      </td>
    </tr>
  );
}

export default async function ResultadoPage({ searchParams }: PageProps<"/financeiro/resultado">) {
  const sp = await searchParams;
  const r = await carregarResultados();

  if (r.meses.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted">
        Ainda não tem vendas por mês. Clique em <strong>Atualizar produtos e vendas do Shopify</strong> na aba{" "}
        <Link href="/financeiro" className="text-ink underline">
          Produtos
        </Link>
        .
      </p>
    );
  }

  const completos = r.meses.filter((m) => !m.parcial);
  const padrao = completos.at(-1) ?? r.meses.at(-1)!;
  const atual: ResultadoMes = r.meses.find((m) => m.mes === sp.mes) ?? padrao;
  const ultimos = r.meses.slice(-13);
  const maiorAbs = Math.max(...ultimos.map((m) => Math.abs(m.sobraProLabore)), atual.proLabore, 1);
  const doze = completos.slice(-12);
  const sobraAno = doze.reduce((a, m) => a + m.sobraProLabore, 0);
  const mesesQuePagam = doze.filter((m) => m.sobraProLabore >= m.proLabore).length;
  const paraVoce = atual.maoDeObra + Math.max(atual.sobraProLabore, 0);

  return (
    <div className="space-y-8">
      <p className="max-w-2xl text-sm text-muted">
        Quanto cada mês realmente deixou, com as vendas reais do Shopify e os custos de hoje do sistema: o que sobrou
        pro seu pró-labore e se deu lucro.
      </p>

      <nav className="flex flex-wrap gap-2" aria-label="Escolher mês">
        {ultimos.map((m) => (
          <Link
            key={m.mes}
            href={`/financeiro/resultado?mes=${m.mes}`}
            aria-current={m.mes === atual.mes ? "page" : undefined}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              m.mes === atual.mes ? "bg-ink text-background" : "bg-accent-soft text-ink/70 hover:bg-border"
            }`}
          >
            {nomeMes(m.mes, true)}
            {m.parcial ? " (até hoje)" : ""}
          </Link>
        ))}
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="space-y-3 rounded-2xl border border-border bg-card px-5 py-5">
          <h2 className="font-serif text-xl font-semibold text-ink first-letter:uppercase">
            {nomeMes(atual.mes)}
            {atual.parcial && <span className="ml-2 text-sm font-normal text-muted">mês em andamento</span>}
          </h2>
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="py-2 pr-3 font-semibold text-ink">
                  Vendas
                  <span className="block text-xs font-normal text-muted">
                    {atual.pedidos} pedidos · já com os cupons descontados, sem o frete
                  </span>
                </td>
                <td className="py-2 text-right align-top font-semibold tabular-nums text-ink">{formatarReais(atual.vendas)}</td>
              </tr>
              <Linha rotulo="Produtos vendidos" valor={atual.produtos} detalhe="materiais, impressão e custo de compra" />
              <Linha rotulo="Mão de obra de produção" valor={atual.maoDeObra} detalhe="seu tempo nos produtos, pelo valor da hora" />
              <Linha
                rotulo="Embalagem de envio"
                valor={atual.embalagem}
                detalhe={r.envioPorPedido !== null ? `${atual.pedidos} pedidos × ${formatarReais(r.envioPorPedido)}` : "sem custo de envio cadastrado"}
              />
              <Linha rotulo="Taxas de cartão e gateway" valor={atual.taxas} detalhe={`${r.taxasPct.toLocaleString("pt-BR")}% sobre vendas + frete`} />
              <Linha rotulo="= Margem de contribuição" valor={atual.margem} forte menos={false} />
              <Linha rotulo="Custos fixos (sem o pró-labore)" valor={atual.fixosSemProLabore} />
              <Linha rotulo="= Sobra pro pró-labore" valor={atual.sobraProLabore} forte menos={false} />
              <Linha rotulo="Pró-labore desejado" valor={atual.proLabore} />
              <Linha rotulo={atual.lucro >= 0 ? "= Lucro do mês" : "= Faltou no mês"} valor={atual.lucro} forte menos={false} />
            </tbody>
          </table>
          {atual.coberturaPct < 95 && (
            <p className="rounded-xl bg-atencao-soft px-4 py-3 text-xs text-atencao">
              {pct(100 - atual.coberturaPct)} das vendas deste mês são de produtos sem custo cadastrado. O custo deles foi
              estimado ({formatarReais(atual.estimado)}) pela média dos produtos que já têm custo. Cadastre os mais vendidos
              pra ficar exato.
            </p>
          )}
          <p className="text-xs text-muted">
            Frete cobrado dos clientes: {formatarReais(atual.frete)} (fica de fora: é repassado pro envio).
            {r.despesasForaDaConta.length > 0 && ` Os cupons não entram de novo nas taxas: as vendas já vêm com o desconto.`}{" "}
            Os custos fixos e o custo dos materiais são os de hoje.
          </p>
        </section>

        <aside className="space-y-4">
          <section className="space-y-2 rounded-2xl bg-ink px-5 py-5 text-background">
            <p className="text-xs uppercase tracking-wide text-background/60">Pra você neste mês</p>
            <p className="font-serif text-3xl font-semibold">{formatarReais(paraVoce)}</p>
            <p className="text-xs text-background/80">
              {formatarReais(atual.maoDeObra)} pelo seu tempo de produção + {formatarReais(Math.max(atual.sobraProLabore, 0))}{" "}
              de sobra pro pró-labore.
            </p>
            <p className="text-xs text-background/80">
              {atual.sobraProLabore >= atual.proLabore
                ? `Deu pra tirar o pró-labore de ${formatarReais(atual.proLabore)} e ainda sobrou ${formatarReais(atual.lucro)} pra empresa.`
                : atual.sobraProLabore > 0
                  ? `Dava pra tirar ${formatarReais(atual.sobraProLabore)} de pró-labore — faltaram ${formatarReais(atual.proLabore - atual.sobraProLabore)} pros ${formatarReais(atual.proLabore)}.`
                  : "As vendas não pagaram os custos fixos: não sobrou pró-labore."}
            </p>
          </section>
          <section className="space-y-1 rounded-2xl border border-border bg-card px-5 py-4 text-xs text-muted">
            <p className="text-sm font-semibold text-ink">Últimos 12 meses fechados</p>
            <p>
              Sobra pro pró-labore no total: <strong className="text-ink">{formatarReais(sobraAno)}</strong> (média de{" "}
              {formatarReais(sobraAno / Math.max(doze.length, 1))} por mês).
            </p>
            <p>
              Meses que pagaram o pró-labore inteiro: <strong className="text-ink">{mesesQuePagam} de {doze.length}</strong>.
            </p>
            <p>
              Por isso a reserva: guardar nos meses fortes o que falta nos fracos.
            </p>
          </section>
        </aside>
      </div>

      <section className="space-y-3">
        <h2 className="font-serif text-xl font-semibold text-ink">Sobra pro pró-labore, mês a mês</h2>
        <div className="space-y-1.5">
          {ultimos.map((m) => {
            const largura = (Math.abs(m.sobraProLabore) / maiorAbs) * 100;
            const pagou = m.sobraProLabore >= m.proLabore;
            return (
              <Link
                key={m.mes}
                href={`/financeiro/resultado?mes=${m.mes}`}
                className="grid grid-cols-[4.5rem_1fr_6.5rem] items-center gap-2 text-xs hover:opacity-80"
              >
                <span className="text-muted">
                  {nomeMes(m.mes, true)}
                  {m.parcial ? "*" : ""}
                </span>
                <span className="relative h-3 rounded-full bg-accent-soft">
                  <span
                    className={`absolute inset-y-0 left-0 rounded-full ${m.sobraProLabore < 0 ? "bg-alerta" : pagou ? "bg-ok" : "bg-atencao"}`}
                    style={{ width: `${Math.min(largura, 100)}%` }}
                  />
                  <span className="absolute inset-y-0 w-px bg-ink/60" style={{ left: `${Math.min((m.proLabore / maiorAbs) * 100, 100)}%` }} />
                </span>
                <span className={`text-right tabular-nums ${m.sobraProLabore < 0 ? "text-alerta" : "text-ink"}`}>
                  {formatarReais(m.sobraProLabore)}
                </span>
              </Link>
            );
          })}
        </div>
        <p className="text-xs text-muted">
          Verde: pagou o pró-labore de {formatarReais(atual.proLabore)} (a linha). Amarelo: sobrou, mas menos que isso.
          Vermelho: não pagou nem os custos fixos. * mês em andamento.
        </p>
      </section>
    </div>
  );
}
