import { ALERTA_SIMPLES, TETO_MEI, type Mei } from "@/lib/financeiro/mei";
import { formatarReais } from "@/lib/financeiro/formato";
import { IncluirSimples } from "./IncluirSimples";

const pct = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const NOMES_MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// Quanto do teto do MEI ja foi usado no ano, a projecao ate dezembro e o
// alerta pra incluir o Simples nas despesas por venda a partir de 80%.
export function MedidorMei({ mei, temSimples }: { mei: Mei; temSimples: boolean }) {
  const alerta = mei.pctVendido >= ALERTA_SIMPLES;
  const passou = mei.pctVendido >= 100;
  const projecaoPassa = mei.pctProjecao >= 100;
  const cor = passou || alerta ? "bg-alerta" : mei.pctVendido >= 70 || projecaoPassa ? "bg-atencao" : "bg-ok";
  const maior = Math.max(...mei.meses.map((m) => m.receita), 1);

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card px-5 py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-xl font-semibold text-ink">Medidor do MEI {mei.ano}</h2>
        <p className="text-xs text-muted">teto de {formatarReais(TETO_MEI)} por ano (jan a dez)</p>
      </div>

      <div className="space-y-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
          <p className="text-ink">
            <span className="font-serif text-2xl font-semibold">{formatarReais(mei.vendido)}</span> vendidos no ano ·{" "}
            <strong>{pct(mei.pctVendido)}</strong> do teto
          </p>
          <p className="text-xs text-muted">faltam {formatarReais(Math.max(TETO_MEI - mei.vendido, 0))}</p>
        </div>
        <div className="relative h-3 overflow-hidden rounded-full bg-accent-soft" aria-hidden="true">
          <div className="absolute inset-y-0 left-0 rounded-full bg-ink/15" style={{ width: `${Math.min(mei.pctProjecao, 100)}%` }} />
          <div className={`absolute inset-y-0 left-0 rounded-full ${cor}`} style={{ width: `${Math.min(mei.pctVendido, 100)}%` }} />
          <div className="absolute inset-y-0 w-px bg-ink/50" style={{ left: `${ALERTA_SIMPLES}%` }} />
        </div>
        <p className="text-xs text-muted">
          Projeção até dezembro: <strong className={projecaoPassa ? "text-alerta" : "text-ink"}>{formatarReais(mei.projecao)}</strong> (
          {pct(mei.pctProjecao)} do teto), repetindo os meses que faltam do ano passado. A linha marca {ALERTA_SIMPLES}%.
          {mei.semHistorico && " Faltam meses do ano passado: a projeção fica mais baixa do que deve."}
        </p>
      </div>

      {passou ? (
        <p className="rounded-xl bg-alerta-soft px-4 py-3 text-sm text-alerta">
          O ano já passou do teto do MEI. Fale com o contador: até 20% acima, paga DAS sobre o excesso e vira microempresa
          no ano seguinte; acima de 20%, o desenquadramento pode valer desde janeiro.
        </p>
      ) : alerta ? (
        <div className="space-y-2 rounded-xl bg-alerta-soft px-4 py-3 text-sm text-alerta">
          <p>
            Chegou em {pct(mei.pctVendido)} do teto. Hora de incluir o imposto do <strong>Simples Nacional</strong> nas
            despesas por venda, pra os preços já nascerem com ele, e de conversar com o contador sobre a mudança.
          </p>
          {!temSimples && <IncluirSimples />}
        </div>
      ) : projecaoPassa ? (
        <p className="rounded-xl bg-atencao-soft px-4 py-3 text-sm text-atencao">
          Se o fim de ano repetir o do ano passado, o ano passa do teto. Fique de olho e converse com o contador.
        </p>
      ) : (
        <p className="text-xs text-muted">
          Quando chegar em {ALERTA_SIMPLES}% do teto, aparece aqui o aviso pra incluir o Simples nas despesas por venda.
        </p>
      )}

      <div className="grid grid-cols-12 items-end gap-1" aria-label="Vendas por mês">
        {mei.meses.map((m, i) => (
          <div key={m.mes} className="flex flex-col items-center gap-1">
            <div
              className={`w-full rounded-t ${m.projetado ? "bg-ink/15" : "bg-ink/70"}`}
              style={{ height: `${Math.max((m.receita / maior) * 64, 2)}px` }}
              title={`${NOMES_MES[i]}: ${formatarReais(m.receita)}${m.projetado ? " (projeção)" : ""}`}
            />
            <span className="text-[10px] text-muted">{NOMES_MES[i]}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted">
        Barras escuras: vendido. Claras: projeção. Vendas de produtos já com desconto, sem o frete — confirme com o contador
        se o frete cobrado entra no faturamento do MEI.
      </p>
    </section>
  );
}
