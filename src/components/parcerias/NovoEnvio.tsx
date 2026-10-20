"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { formatarReais, normalizarBusca } from "@/lib/financeiro/formato";
import { IconeLixeira, botaoIcone } from "@/components/financeiro/Icones";
import { botaoPrimario, botaoSecundario, campo, rotulo } from "@/components/financeiro/estilos";

type ItemCatalogo = { id: string; nome: string; custo: number | null };
type Item = { chave: number; varianteId: string | null; descricao: string; quantidade: string; custo: string };

const hoje = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const paraCampo = (n: number | null) => (n === null ? "" : n.toFixed(2).replace(".", ","));

// Lanca o que foi mandado pra criadora: produtos do catalogo (custo vem do
// Financeiro) ou itens avulsos (cartao escrito a mao, brinde...).
export function NovoEnvio({ criadoraId, catalogo }: { criadoraId: string; catalogo: ItemCatalogo[] }) {
  const id = useId();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [itens, setItens] = useState<Item[]>([]);
  const [data, setData] = useState(hoje);
  const [frete, setFrete] = useState("");
  const [rastreio, setRastreio] = useState("");
  const [observacao, setObservacao] = useState("");
  const [erroMsg, setErroMsg] = useState<string | null>(null);
  const [proxima, setProxima] = useState(1);

  const resultados = useMemo(() => {
    const termos = normalizarBusca(busca).split(/\s+/).filter(Boolean);
    if (termos.length === 0) return [];
    return catalogo.filter((c) => termos.every((t) => normalizarBusca(c.nome).includes(t))).slice(0, 8);
  }, [busca, catalogo]);

  function adicionar(c: ItemCatalogo | null) {
    setItens((atual) => [...atual, { chave: proxima, varianteId: c?.id ?? null, descricao: c?.nome ?? "", quantidade: "1", custo: paraCampo(c?.custo ?? null) }]);
    setProxima((n) => n + 1);
    setBusca("");
  }

  const mudar = (chave: number, campoItem: keyof Item, valor: string) =>
    setItens((atual) => atual.map((i) => (i.chave === chave ? { ...i, [campoItem]: valor } : i)));

  const total =
    itens.reduce((acc, i) => acc + (Number(i.custo.replace(/\./g, "").replace(",", ".")) || 0) * (Number(i.quantidade) || 0), 0) +
    (Number(frete.replace(/\./g, "").replace(",", ".")) || 0);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErroMsg(null);
    const r = await enviar(`/api/parcerias/criadoras/${criadoraId}/envios`, "POST", {
      data,
      custoFrete: frete,
      rastreio,
      observacao,
      itens: itens.map((i) => ({ varianteId: i.varianteId, descricao: i.descricao, quantidade: i.quantidade, custoUnitario: i.custo })),
    });
    if (!r.ok) {
      setErroMsg(r.erro);
      return;
    }
    setAberto(false);
    setItens([]);
    setFrete("");
    setRastreio("");
    setObservacao("");
    startTransition(() => router.refresh());
  }

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className={botaoSecundario}>
        + Registrar envio
      </button>
    );
  }

  return (
    <form onSubmit={salvar} className="space-y-4 rounded-xl bg-accent-soft/50 p-4">
      <div className="relative">
        <label htmlFor={`${id}-busca`} className={rotulo}>
          Produto enviado (busca no catálogo do Shopify)
        </label>
        <input
          id={`${id}-busca`}
          placeholder="Ex: case argolada A5"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className={`${campo} w-full`}
          autoComplete="off"
        />
        {resultados.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-border bg-card shadow-lg">
            {resultados.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => adicionar(c)} className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent-soft">
                  <span className="text-ink">{c.nome}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted">{c.custo !== null ? formatarReais(c.custo) : "sem custo"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" onClick={() => adicionar(null)} className="mt-2 text-xs text-ink underline">
          + item avulso (cartão, brinde, embalagem especial...)
        </button>
      </div>

      {itens.length > 0 && (
        <ul className="space-y-2">
          {itens.map((i) => (
            <li key={i.chave} className="flex flex-wrap items-end gap-2 rounded-lg bg-card p-2">
              <div className="min-w-0 flex-1 basis-56">
                <label className={rotulo} htmlFor={`${id}-d-${i.chave}`}>
                  Item
                </label>
                {i.varianteId ? (
                  <p id={`${id}-d-${i.chave}`} className="py-1.5 text-sm text-ink">
                    {i.descricao}
                  </p>
                ) : (
                  <input id={`${id}-d-${i.chave}`} value={i.descricao} onChange={(e) => mudar(i.chave, "descricao", e.target.value)} className={`${campo} w-full`} />
                )}
              </div>
              <div>
                <label className={rotulo} htmlFor={`${id}-q-${i.chave}`}>
                  Qtd.
                </label>
                <input
                  id={`${id}-q-${i.chave}`}
                  inputMode="numeric"
                  value={i.quantidade}
                  onChange={(e) => mudar(i.chave, "quantidade", e.target.value)}
                  className={`${campo} w-16`}
                />
              </div>
              <div>
                <label className={rotulo} htmlFor={`${id}-c-${i.chave}`}>
                  Custo un. (R$)
                </label>
                <input
                  id={`${id}-c-${i.chave}`}
                  inputMode="decimal"
                  placeholder={i.varianteId ? "do Financeiro" : "0,00"}
                  value={i.custo}
                  onChange={(e) => mudar(i.chave, "custo", e.target.value)}
                  className={`${campo} w-28`}
                />
              </div>
              <button
                type="button"
                onClick={() => setItens((atual) => atual.filter((x) => x.chave !== i.chave))}
                aria-label="Tirar item"
                title="Tirar item"
                className={botaoIcone}
              >
                <IconeLixeira />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-3">
        <div>
          <label htmlFor={`${id}-data`} className={rotulo}>
            Data do envio
          </label>
          <input id={`${id}-data`} type="date" value={data} onChange={(e) => setData(e.target.value)} className={campo} />
        </div>
        <div>
          <label htmlFor={`${id}-frete`} className={rotulo}>
            Frete pago (R$)
          </label>
          <input id={`${id}-frete`} inputMode="decimal" value={frete} onChange={(e) => setFrete(e.target.value)} className={`${campo} w-28`} />
        </div>
        <div>
          <label htmlFor={`${id}-rastreio`} className={rotulo}>
            Código de rastreio
          </label>
          <input id={`${id}-rastreio`} value={rastreio} onChange={(e) => setRastreio(e.target.value)} className={`${campo} w-48`} />
        </div>
        <div className="min-w-0 flex-1 basis-56">
          <label htmlFor={`${id}-obs`} className={rotulo}>
            Observação
          </label>
          <input id={`${id}-obs`} placeholder="Ex: entregue em mãos" value={observacao} onChange={(e) => setObservacao(e.target.value)} className={`${campo} w-full`} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={isPending || itens.length === 0} className={botaoPrimario}>
          Salvar envio
        </button>
        <button type="button" onClick={() => setAberto(false)} className={botaoSecundario}>
          Cancelar
        </button>
        {itens.length > 0 && <span className="text-sm tabular-nums text-muted">Custo total: {formatarReais(total)}</span>}
        {erroMsg && <span className="text-xs text-alerta">{erroMsg}</span>}
      </div>
    </form>
  );
}
