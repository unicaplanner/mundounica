"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { chamarApi } from "@/components/marketing/Acoes";
import { botaoPrimario, botaoSecundario, campo, rotulo } from "@/components/financeiro/estilos";
import { ENTREGA_DIAS_UTEIS, ultimoDiaPorRegiao, type PrazoRegiao } from "@/lib/marketing/campanhas";
import { dataCurta } from "@/lib/marketing/datas";

// Formulario da campanha. O "Calcular" sugere o ultimo dia de pedido por
// regiao a partir de uma data limite (ex: 24/12) e do prazo de producao.

export type ValoresCampanha = {
  nome?: string;
  descricao?: string | null;
  oferta?: string | null;
  descontoPct?: string | null;
  cupom?: string | null;
  brinde?: string | null;
  brindeQtd?: string | null;
  quantidade?: string | null;
  freteGratisAcima?: string | null;
  produtos?: string | null;
  inicio?: string | null;
  fim?: string | null;
  prazoProducaoDias?: string | null;
  ultimoDiaPedido?: string | null;
  prazosRegiao?: PrazoRegiao[];
};

export function CampanhaForm({
  id,
  inicial,
  prazoFilaDias,
  onPronto,
}: {
  id?: string;
  inicial: ValoresCampanha;
  prazoFilaDias: number | null;
  onPronto: () => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [v, setV] = useState<ValoresCampanha>(inicial);
  const [limite, setLimite] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const muda = (k: keyof ValoresCampanha) => (e: { target: { value: string } }) => setV((a) => ({ ...a, [k]: e.target.value }));
  const prazoUsado = Number(v.prazoProducaoDias) || prazoFilaDias || null;

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true);
    setMensagem(null);
    try {
      if (id) await chamarApi(`/api/marketing/campanhas/${id}`, v);
      else await chamarApi("/api/marketing/campanhas", v, "POST");
      startTransition(() => router.refresh());
      onPronto();
    } catch (err) {
      setMensagem((err as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  const linha = (k: keyof ValoresCampanha, label: string, dica?: string, tipo = "text") => (
    <label className="flex flex-col">
      <span className={rotulo}>{label}</span>
      <input type={tipo} value={(v[k] as string) ?? ""} onChange={muda(k)} className={campo} placeholder={dica} />
    </label>
  );

  return (
    <form onSubmit={salvar} className="flex flex-col gap-4 rounded-2xl border border-ink/20 bg-card p-4 sm:p-5">
      <h3 className="font-serif text-lg font-semibold text-ink">{id ? "Editar campanha" : "Nova campanha"}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col sm:col-span-2">
          <span className={rotulo}>Nome</span>
          <input value={v.nome ?? ""} onChange={muda("nome")} className={campo} placeholder="Black Friday 2026" required />
        </label>
        <label className="flex flex-col sm:col-span-2">
          <span className={rotulo}>Oferta, do jeito que vai no post ([OFERTA])</span>
          <textarea value={v.oferta ?? ""} onChange={muda("oferta")} rows={2} className={campo} placeholder="Planejador de Metas de brinde acima de R$ 199" />
        </label>
        {linha("inicio", "Começa em", undefined, "date")}
        {linha("fim", "Termina em", undefined, "date")}
        {linha("descontoPct", "Desconto em % ([DESCONTO])", "ex: 15")}
        {linha("cupom", "Cupom ([CUPOM])", "ex: BLACK15")}
        {linha("brinde", "Brinde ([BRINDE])", "ex: Planejador de Metas")}
        {linha("brindeQtd", "Quantos brindes", "ex: 40")}
        {linha("quantidade", "Tamanho do lote ([QTD])", "ex: 50")}
        {linha("freteGratisAcima", "Frete grátis acima de (R$) ([FRETE])", "ex: 299")}
        <label className="flex flex-col sm:col-span-2">
          <span className={rotulo}>Produtos e kits da oferta (um por linha, nome ou link da loja)</span>
          <textarea value={v.produtos ?? ""} onChange={muda("produtos")} rows={3} className={campo} />
        </label>
      </div>

      <section className="flex flex-col gap-3 rounded-xl bg-accent-soft p-3">
        <h4 className="text-sm font-semibold text-ink">Prazos ([PRAZO] e [ÚLTIMO DIA])</h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {linha("prazoProducaoDias", "Prazo de produção prometido (dias úteis)", prazoFilaDias ? `vazio = prazo real da fila: ${prazoFilaDias}` : "ex: 20")}
          {linha("ultimoDiaPedido", "Último dia pra pedir (geral)", undefined, "date")}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex flex-col">
            <span className={rotulo}>Precisa chegar até</span>
            <input type="date" value={limite} onChange={(e) => setLimite(e.target.value)} className={campo} />
          </label>
          <button
            type="button"
            disabled={!limite || !prazoUsado}
            onClick={() => setV((a) => ({ ...a, prazosRegiao: ultimoDiaPorRegiao(limite, prazoUsado!) }))}
            className={botaoSecundario}
          >
            Calcular último dia por região
          </button>
        </div>
        <p className="text-xs text-muted">
          Conta: data limite − entrega − {prazoUsado ?? "?"} dias úteis de produção. Entrega estimada a partir de Curitiba:{" "}
          {ENTREGA_DIAS_UTEIS.map((r) => `${r.regiao} ${r.dias}`).join(", ")} dias úteis.
        </p>
        {!!v.prazosRegiao?.length && (
          <ul className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
            {v.prazosRegiao.map((r, i) => (
              <li key={r.regiao} className="flex items-center gap-2">
                <span className="w-28 text-ink">{r.regiao}</span>
                <input
                  type="date"
                  value={r.ultimoDia}
                  onChange={(e) =>
                    setV((a) => ({ ...a, prazosRegiao: a.prazosRegiao!.map((x, j) => (j === i ? { ...x, ultimoDia: e.target.value } : x)) }))
                  }
                  className={campo}
                  aria-label={`Último dia ${r.regiao}`}
                />
                <span className="text-xs text-muted">{dataCurta(r.ultimoDia)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <label className="flex flex-col">
        <span className={rotulo}>Observações</span>
        <textarea value={v.descricao ?? ""} onChange={muda("descricao")} rows={2} className={campo} />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={ocupado} className={botaoPrimario}>
          {ocupado ? "Salvando…" : id ? "Salvar campanha" : "Criar campanha"}
        </button>
        <button type="button" onClick={onPronto} className={botaoSecundario}>
          Cancelar
        </button>
        {mensagem && <span className="text-xs text-alerta">{mensagem}</span>}
      </div>
    </form>
  );
}
