"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { formatarReais, normalizarNumero, paraCampo } from "@/lib/financeiro/formato";
import { botaoPrimario, botaoSecundario, campo, rotulo } from "./estilos";

type Mes = { mes: string; total: number; pedidos: number };

const NOMES_MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const nomeMes = (m: string) => {
  const [ano, mes] = m.split("-");
  return `${NOMES_MES[Number(mes) - 1]}/${ano.slice(2)}`;
};

export function ParametrosPrecificacao({
  faturamentoMensal,
  lucroDesejado,
}: {
  faturamentoMensal: number | null;
  lucroDesejado: number;
}) {
  const id = useId();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [faturamento, setFaturamento] = useState(faturamentoMensal !== null ? paraCampo(faturamentoMensal, 2) : "");
  const [lucro, setLucro] = useState(paraCampo(lucroDesejado));
  const [meses, setMeses] = useState<Mes[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [mensagem, setMensagem] = useState<{ texto: string; erro: boolean } | null>(null);

  async function salvar(body: Record<string, string>, ok: string) {
    setMensagem(null);
    const resultado = await enviar("/api/financeiro/configuracao", "PATCH", body);
    if (!resultado.ok) {
      setMensagem({ texto: resultado.erro, erro: true });
      return;
    }
    setMensagem({ texto: ok, erro: false });
    startTransition(() => router.refresh());
  }

  async function buscarShopify() {
    setBuscando(true);
    setMensagem(null);
    const resultado = await fetch("/api/financeiro/faturamento").then((r) => r.json()).catch(() => null);
    setBuscando(false);
    if (!resultado?.ok) {
      setMensagem({ texto: resultado?.erro ?? "Não deu pra ler as vendas do Shopify.", erro: true });
      return;
    }
    setMeses(resultado.meses);
  }

  const media = (n: number) => (meses ? meses.slice(-n).reduce((a, m) => a + m.total, 0) / n : 0);
  const maior = meses ? Math.max(...meses.map((m) => m.total), 1) : 1;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            salvar({ faturamentoMensal: normalizarNumero(faturamento) }, "Faturamento médio salvo.");
          }}
          className="space-y-2"
        >
          <label htmlFor={`${id}-faturamento`} className={rotulo}>
            Faturamento médio por mês (R$)
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id={`${id}-faturamento`}
              type="text"
              inputMode="decimal"
              placeholder="6.355,87"
              value={faturamento}
              onChange={(e) => setFaturamento(e.target.value)}
              className={`${campo} w-36`}
            />
            <button type="submit" disabled={isPending} className={botaoPrimario}>
              Salvar
            </button>
          </div>
          <button type="button" onClick={buscarShopify} disabled={buscando} className={botaoSecundario}>
            {buscando ? "Lendo as vendas..." : "Calcular pelas vendas do Shopify"}
          </button>
        </form>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            salvar({ lucroDesejado: normalizarNumero(lucro) }, "Lucro desejado salvo.");
          }}
          className="space-y-2"
        >
          <label htmlFor={`${id}-lucro`} className={rotulo}>
            Lucro desejado (% sobre o preço, depois de pagar tudo)
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id={`${id}-lucro`}
              type="text"
              inputMode="decimal"
              value={lucro}
              onChange={(e) => setLucro(e.target.value)}
              className={`${campo} w-20`}
            />
            <button type="submit" disabled={isPending} className={botaoPrimario}>
              Salvar
            </button>
          </div>
        </form>
      </div>

      {mensagem && (
        <p role="status" className={`text-xs ${mensagem.erro ? "text-alerta" : "text-muted"}`}>
          {mensagem.texto}
        </p>
      )}

      {meses && (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Vendas de produtos por mês (sem frete)</p>
          <div className="space-y-1.5">
            {meses.map((m) => (
              <div key={m.mes} className="grid grid-cols-[3.5rem_1fr_6.5rem] items-center gap-2 text-xs">
                <span className="text-muted">{nomeMes(m.mes)}</span>
                <span className="h-2.5 rounded-full bg-accent-soft">
                  <span className="block h-2.5 rounded-full bg-accent-ink" style={{ width: `${(m.total / maior) * 100}%` }} />
                </span>
                <span className="text-right tabular-nums text-ink">{formatarReais(m.total)}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {[12, 6, 3].map((n) => (
              <button
                key={n}
                type="button"
                disabled={isPending}
                onClick={() => {
                  const valor = media(n);
                  setFaturamento(paraCampo(Math.round(valor * 100) / 100, 2));
                  salvar({ faturamentoMensal: valor.toFixed(2) }, `Usando a média dos últimos ${n} meses.`);
                }}
                className={botaoSecundario}
              >
                Usar média de {n} meses: {formatarReais(media(n))}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">
            Pra precificar, a média de 12 meses costuma ser a mais justa: inclui o ano todo, com os meses fortes e os
            fracos.
          </p>
        </div>
      )}
    </div>
  );
}
