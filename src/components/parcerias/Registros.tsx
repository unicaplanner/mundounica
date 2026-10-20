"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { IconeLixeira, botaoIcone } from "@/components/financeiro/Icones";
import { botaoPrimario, campo, rotulo } from "@/components/financeiro/estilos";

const dataBR = (iso: string) => {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
};
const hoje = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

// Historico da conversa: o que ela respondeu, o que foi combinado.
export function Registros({ criadoraId, registros }: { criadoraId: string; registros: { id: string; data: string; texto: string }[] }) {
  const id = useId();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [texto, setTexto] = useState("");
  const [data, setData] = useState(hoje);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    setErroMsg(null);
    const r = await enviar(`/api/parcerias/criadoras/${criadoraId}/registros`, "POST", { texto, data });
    if (!r.ok) {
      setErroMsg(r.erro);
      return;
    }
    setTexto("");
    startTransition(() => router.refresh());
  }

  async function remover(rid: string) {
    setExcluindo(null);
    const r = await enviar(`/api/parcerias/criadoras/${criadoraId}/registros/${rid}`, "DELETE");
    if (!r.ok) setErroMsg(r.erro);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-3">
      <form onSubmit={adicionar} className="flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor={`${id}-data`} className={rotulo}>
            Data
          </label>
          <input id={`${id}-data`} type="date" value={data} onChange={(e) => setData(e.target.value)} className={campo} />
        </div>
        <div className="min-w-0 flex-1 basis-64">
          <label htmlFor={`${id}-texto`} className={rotulo}>
            Anotação
          </label>
          <input
            id={`${id}-texto`}
            placeholder="Ex: respondeu que topa, pediu o kit A5"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className={`${campo} w-full`}
          />
        </div>
        <button type="submit" disabled={isPending || !texto.trim()} className={botaoPrimario}>
          Anotar
        </button>
      </form>
      {erroMsg && <p className="text-xs text-alerta">{erroMsg}</p>}
      {registros.length === 0 ? (
        <p className="text-sm text-muted">Nada anotado ainda.</p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {registros.map((r) => (
            <li key={r.id} className={`flex items-start gap-3 py-2.5 text-sm ${excluindo === r.id ? "bg-alerta-soft" : ""}`}>
              <span className="w-20 shrink-0 pt-0.5 text-xs tabular-nums text-muted">{dataBR(r.data)}</span>
              <span className="min-w-0 flex-1 whitespace-pre-line text-ink">{r.texto}</span>
              {excluindo === r.id ? (
                <span className="flex items-center gap-2 text-xs">
                  <button type="button" onClick={() => remover(r.id)} className="font-semibold text-alerta underline">
                    Excluir
                  </button>
                  <button type="button" onClick={() => setExcluindo(null)} className="text-muted underline">
                    Cancelar
                  </button>
                </span>
              ) : (
                <button type="button" onClick={() => setExcluindo(r.id)} aria-label="Excluir anotação" title="Excluir" className={botaoIcone}>
                  <IconeLixeira />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
