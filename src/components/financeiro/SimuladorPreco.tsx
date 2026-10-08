"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { analisarPreco, precoSugerido, type ParametrosAnalise } from "@/lib/financeiro/analise";
import { formatarReais, normalizarNumero, paraCampo } from "@/lib/financeiro/formato";
import { StatusPreco } from "./StatusPreco";

const pct = (n: number, casas = 1) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: casas })}%`;

// "E se eu cobrar R$ X?": mostra na hora pra onde vai cada real do preco --
// producao, embalagem de envio, cada taxa e imposto -- e a margem de
// contribuicao que sobra pra pagar os custos fixos, comparada com a meta do
// tipo do produto. Os detalhes de cada custo ficam nas outras abas.
export function SimuladorPreco({
  custo,
  precoSite,
  parametros,
  meta,
  rotuloTipo,
  rotuloCusto = "Produção (materiais, impressão e mão de obra)",
  envioPorPedido = null,
  itensPorPedido = null,
}: {
  custo: number;
  precoSite: number | null;
  parametros: ParametrosAnalise;
  meta: number; // meta de margem de contribuicao do tipo, em %
  rotuloTipo: string; // "produção própria", "revenda", "kit"
  rotuloCusto?: string;
  envioPorPedido?: number | null;
  itensPorPedido?: number | null;
}) {
  const id = useId();
  const sugerido = precoSugerido(custo, parametros, meta);
  const [preco, setPreco] = useState(paraCampo(precoSite ?? Math.ceil((sugerido ?? custo * 2) * 10) / 10, 2));
  const valor = Number(normalizarNumero(preco));
  const analise = valor > 0 ? analisarPreco(custo, valor, parametros, meta) : null;

  const linha = (rotulo: React.ReactNode, reais: number, detalhe?: React.ReactNode, link?: string) => (
    <tr className="border-t border-border">
      <td className="py-1.5 pr-3">
        {link ? (
          <Link href={link} className="hover:underline">
            {rotulo}
          </Link>
        ) : (
          rotulo
        )}
        {detalhe && <span className="ml-1 text-xs text-muted">{detalhe}</span>}
      </td>
      <td className="py-1.5 pr-3 text-right tabular-nums">− {formatarReais(reais)}</td>
      <td className="py-1.5 text-right text-xs tabular-nums text-muted">{valor > 0 ? pct((reais / valor) * 100) : ""}</td>
    </tr>
  );

  return (
    <div className="space-y-4 text-sm">
      <p>
        <span className="text-muted">Preço sugerido: </span>
        <span className="font-semibold text-ink">{sugerido !== null ? formatarReais(sugerido) : "—"}</span>
        <span className="text-xs text-muted">
          {" "}
          (pra ter {pct(meta)} de margem de contribuição, a meta de {rotuloTipo})
        </span>
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
        <>
          <table className="w-full max-w-xl">
            <tbody>
              <tr>
                <td className="py-1.5 pr-3 font-semibold text-ink">Preço de venda</td>
                <td className="py-1.5 pr-3 text-right font-semibold tabular-nums text-ink">{formatarReais(valor)}</td>
                <td className="py-1.5 text-right text-xs tabular-nums text-muted">100%</td>
              </tr>
              {linha(rotuloCusto, custo)}
              {linha(
                "Embalagem de envio",
                analise.envio,
                envioPorPedido !== null && itensPorPedido
                  ? `(${formatarReais(envioPorPedido)} por pedido ÷ ${itensPorPedido.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} produtos)`
                  : "(ainda sem custo — veja a aba Envio)",
                "/financeiro/envio"
              )}
              {parametros.despesas.map((d) => (
                <tr key={d.nome} className="border-t border-border">
                  <td className="py-1.5 pr-3">
                    <Link href="/financeiro/custos" className="hover:underline">
                      {d.nome}
                    </Link>
                    <span className="ml-1 text-xs text-muted">({pct(d.pct, 2)})</span>
                  </td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">− {formatarReais((valor * d.pct) / 100)}</td>
                  <td className="py-1.5 text-right text-xs tabular-nums text-muted">{pct(d.pct, 2)}</td>
                </tr>
              ))}
              {parametros.despesas.length === 0 && (
                <tr className="border-t border-border">
                  <td colSpan={3} className="py-1.5 text-xs text-muted">
                    Nenhuma taxa ou imposto por venda cadastrado (Shopify, gateway, Simples) —{" "}
                    <Link href="/financeiro/custos" className="underline">
                      cadastrar
                    </Link>
                  </td>
                </tr>
              )}
              <tr className="border-t-2 border-ink/30">
                <td className="py-2 pr-3 font-semibold text-ink">
                  = Margem de contribuição
                  <span className="block text-xs font-normal text-muted">o que sobra pra pagar os custos fixos e dar lucro</span>
                </td>
                <td
                  className={`py-2 pr-3 text-right align-top font-bold tabular-nums ${analise.contribuicao < 0 ? "text-alerta" : "text-ink"}`}
                >
                  {formatarReais(analise.contribuicao)}
                </td>
                <td
                  className={`py-2 text-right align-top text-xs font-semibold tabular-nums ${analise.contribuicao < 0 ? "text-alerta" : "text-ink"}`}
                >
                  {pct(analise.contribuicaoPct)}
                  <span className="block font-normal text-muted">meta {pct(meta)}</span>
                </td>
              </tr>
            </tbody>
          </table>
          {analise.vendasParaFixos !== null && (
            <p className="max-w-xl rounded-xl bg-accent-soft/60 px-4 py-3 text-xs text-ink/80">
              Cada venda deste preço paga <strong>{formatarReais(analise.contribuicao)}</strong> dos{" "}
              {formatarReais(parametros.totalFixos)} de custos fixos do mês:{" "}
              <strong>{analise.vendasParaFixos.toLocaleString("pt-BR")} vendas</strong> iguais a esta pagariam tudo. Os
              fixos são pagos pela soma de todas as vendas — veja a cobertura na aba{" "}
              <Link href="/financeiro/precificacao" className="underline">
                Precificação
              </Link>
              .
            </p>
          )}
          {analise.markupPraticado !== null && (
            <p className="text-xs text-muted">
              Markup praticado {analise.markupPraticado.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}× sobre o custo
              do produto.
            </p>
          )}
        </>
      )}
    </div>
  );
}
