"use client";

import { useId, useState } from "react";
import { analisarPreco, precoSugerido, type ParametrosAnalise } from "@/lib/financeiro/analise";
import { formatarReais, normalizarNumero, paraCampo } from "@/lib/financeiro/formato";
import { StatusPreco } from "./StatusPreco";

// "E se eu cobrar R$ X?": mostra na hora o lucro e a margem de um preco,
// usando os custos fixos, despesas por venda e lucro desejado cadastrados.
export function SimuladorPreco({
  custo,
  precoSite,
  parametros,
}: {
  custo: number;
  precoSite: number | null;
  parametros: ParametrosAnalise;
}) {
  const id = useId();
  const sugerido = precoSugerido(custo, parametros);
  const [preco, setPreco] = useState(paraCampo(precoSite ?? Math.ceil((sugerido ?? custo * 2) * 10) / 10, 2));
  const valor = Number(normalizarNumero(preco));
  const analise = valor > 0 ? analisarPreco(custo, valor, parametros) : null;

  return (
    <div className="space-y-3 text-sm">
      <p>
        <span className="text-muted">Preço sugerido: </span>
        <span className="font-semibold text-ink">{sugerido !== null ? formatarReais(sugerido) : "—"}</span>
        <span className="text-xs text-muted"> (pra ter {parametros.lucroPct.toLocaleString("pt-BR")}% de lucro)</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`${id}-preco`} className="text-xs text-muted">
          E se eu cobrar
        </label>
        <input
          id={`${id}-preco`}
          type="text"
          inputMode="decimal"
          value={preco}
          onChange={(e) => setPreco(e.target.value)}
          className="w-24 rounded-md border border-border bg-card px-2 py-1 text-ink focus:border-accent-ink focus:outline-none"
        />
        {analise && <StatusPreco status={analise.status} />}
      </div>
      {analise && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
          <div>
            <dt className="text-muted">Lucro por unidade</dt>
            <dd className={`font-semibold tabular-nums ${analise.lucro < 0 ? "text-alerta" : "text-ink"}`}>
              {formatarReais(analise.lucro)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Lucro %</dt>
            <dd className="font-semibold tabular-nums text-ink">{analise.lucroPct.toFixed(1).replace(".", ",")}%</dd>
          </div>
          <div>
            <dt className="text-muted">Margem de contribuição</dt>
            <dd className="font-semibold tabular-nums text-ink">{analise.contribuicaoPct.toFixed(1).replace(".", ",")}%</dd>
          </div>
          <div>
            <dt className="text-muted">Markup praticado</dt>
            <dd className="font-semibold tabular-nums text-ink">
              {analise.markupPraticado !== null ? `${analise.markupPraticado.toFixed(2).replace(".", ",")}×` : "—"}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}
