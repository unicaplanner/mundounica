import Link from "next/link";
import { carregarFluxoCaixa } from "@/lib/financeiro/caixa";
import { formatarReais } from "@/lib/financeiro/formato";
import { SaldoCaixa } from "@/components/financeiro/SaldoCaixa";

export const dynamic = "force-dynamic";

const NOMES_MES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const nomeMes = (m: string) => {
  const [ano, mes] = m.split("-");
  return `${NOMES_MES[Number(mes) - 1]}/${ano.slice(2)}`;
};
const dataBR = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" });
const diaBR = (dia: string) => {
  const [, m, d] = dia.split("-");
  return `${d}/${m}`;
};
const ROTULO_BASE = { ano_passado: "mesmo mês do ano passado", media: "média dos últimos 3 meses", real: "o que já vendeu" };

export default async function CaixaPage() {
  const f = await carregarFluxoCaixa();
  const temSaldo = f.saldoInicial !== null;
  const valores = f.pontos.map((p) => p.saldo);
  const max = Math.max(...valores, 0);
  const min = Math.min(...valores, 0);
  const faixa = max - min || 1;
  const largura = 600;
  const altura = 140;
  const x = (i: number) => (i / Math.max(f.pontos.length - 1, 1)) * largura;
  const y = (v: number) => ((max - v) / faixa) * altura;
  const linha = f.pontos.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.saldo).toFixed(1)}`).join(" ");
  const negativo = f.menor && f.menor.saldo < 0;

  return (
    <div className="space-y-8">
      <p className="max-w-2xl text-sm text-muted">
        Quanto deve ter em conta daqui a 30, 60 e 90 dias, se as vendas repetirem o mesmo mês do ano passado e saírem
        os custos de sempre: reposição de material, embalagem, taxas e os custos fixos (com o pró-labore).
      </p>

      <section className="space-y-3 rounded-2xl border border-border bg-card px-5 py-5">
        {temSaldo ? (
          <p className="text-sm text-muted">
            Ponto de partida: <strong className="text-ink">{formatarReais(f.saldoInicial!)}</strong> em conta em{" "}
            {dataBR.format(f.saldoEm!)}.
            {f.saldoVelho && <span className="text-atencao"> Esse saldo tem mais de um mês: atualize pra projeção ficar certa.</span>}
          </p>
        ) : (
          <p className="text-sm text-atencao">
            Informe quanto tem em conta hoje (banco + Shopify a receber) pra projeção partir do valor real. Sem isso, a
            conta parte de zero e mostra só o que entra e sai.
          </p>
        )}
        <SaldoCaixa temSaldo={temSaldo} />
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        {f.marcos.map((m) => (
          <div key={m.dias} className={`rounded-2xl px-5 py-4 ${m.saldo < 0 ? "bg-alerta-soft" : "bg-accent-soft"}`}>
            <p className="text-xs text-muted">
              Em {m.dias} dias ({diaBR(m.dia)})
            </p>
            <p className={`font-serif text-2xl font-semibold ${m.saldo < 0 ? "text-alerta" : "text-ink"}`}>{formatarReais(m.saldo)}</p>
            {!temSaldo && <p className="text-xs text-muted">a partir de zero</p>}
          </div>
        ))}
      </div>

      {negativo && (
        <p className="rounded-2xl bg-alerta-soft px-4 py-3 text-sm text-alerta">
          <strong>Atenção:</strong> pela projeção, o caixa fica negativo e chega a {formatarReais(f.menor!.saldo)} em{" "}
          {diaBR(f.menor!.dia)}. Dá pra se antecipar: segurar compras grandes, tirar menos pró-labore nesse mês ou puxar
          vendas (campanha, lançamento).
        </p>
      )}

      {f.pontos.length > 1 && (
        <section className="space-y-2">
          <h2 className="font-serif text-xl font-semibold text-ink">Saldo dia a dia</h2>
          <svg viewBox={`0 0 ${largura} ${altura}`} className="h-40 w-full" preserveAspectRatio="none" role="img" aria-label="Saldo projetado nos próximos 90 dias">
            {min < 0 && <line x1="0" x2={largura} y1={y(0)} y2={y(0)} className="stroke-alerta" strokeDasharray="4 4" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
            <path d={linha} fill="none" className="stroke-ink" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="flex justify-between text-xs text-muted">
            <span>hoje</span>
            <span>30 dias</span>
            <span>60 dias</span>
            <span>90 dias</span>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-serif text-xl font-semibold text-ink">Mês a mês</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm [&_td]:pr-4 [&_th]:pr-4">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="py-2 font-semibold">Mês</th>
                <th className="py-2 text-right font-semibold">Vendas</th>
                <th className="py-2 text-right font-semibold">Material</th>
                <th className="py-2 text-right font-semibold">Embalagem</th>
                <th className="py-2 text-right font-semibold">Taxas</th>
                <th className="py-2 text-right font-semibold">Fixos + pró-labore</th>
                <th className="py-2 text-right font-semibold">Sobra</th>
              </tr>
            </thead>
            <tbody>
              {f.meses.map((m) => (
                <tr key={m.mes} className="border-b border-border">
                  <td className="py-2">
                    {nomeMes(m.mes)}
                    <span className="block text-xs text-muted">
                      {m.dias} {m.dias === 1 ? "dia" : "dias"} · {ROTULO_BASE[m.base]}
                    </span>
                  </td>
                  <td className="py-2 text-right tabular-nums">{formatarReais(m.vendas)}</td>
                  <td className="py-2 text-right tabular-nums text-muted">− {formatarReais(m.materiais)}</td>
                  <td className="py-2 text-right tabular-nums text-muted">− {formatarReais(m.embalagem)}</td>
                  <td className="py-2 text-right tabular-nums text-muted">− {formatarReais(m.taxas)}</td>
                  <td className="py-2 text-right tabular-nums text-muted">− {formatarReais(m.fixos)}</td>
                  <td className={`py-2 text-right font-semibold tabular-nums ${m.saldo < 0 ? "text-alerta" : "text-ink"}`}>
                    {formatarReais(m.saldo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted">
          Os valores de cada mês contam só os dias dentro da projeção. Material = o custo dos produtos vendidos (repor o
          que saiu), sem a mão de obra, que já está no pró-labore. O frete cobrado entra e sai (vai pro envio). Não entram
          compras grandes fora do comum nem parcelas: isso vem com a Fase 3 (dívidas e parcelamentos).
          {f.semHistorico && " Alguns meses não têm o ano anterior nas vendas: usei a média dos últimos 3 meses."} A base de
          vendas é a do{" "}
          <Link href="/financeiro/resultado" className="text-ink underline">
            Resultado do mês
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
