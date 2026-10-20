"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { FORMATOS } from "@/lib/parcerias/rotulos";
import { IconeLixeira, botaoIcone } from "@/components/financeiro/Icones";
import { botaoPrimario, botaoSecundario, campo, rotulo } from "@/components/financeiro/estilos";

type Entrega = {
  id: string;
  formato: string;
  prazo: string; // yyyy-mm-dd ou ""
  publicadoEm: string;
  link: string | null;
  sinalizou: boolean;
  observacao: string | null;
};

const dataBR = (iso: string) => {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
};
const hoje = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

// Posts combinados x publicados, com link e se ela sinalizou presente/#publi.
export function Entregas({ criadoraId, entregas }: { criadoraId: string; entregas: Entrega[] }) {
  const id = useId();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [novo, setNovo] = useState({ formato: FORMATOS[0], prazo: "", observacao: "" });
  const [links, setLinks] = useState<Record<string, string>>({});
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [erroMsg, setErroMsg] = useState<string | null>(null);
  const base = `/api/parcerias/criadoras/${criadoraId}/entregas`;

  async function chamar(url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) {
    setErroMsg(null);
    const r = await enviar(url, method, body);
    if (!r.ok) {
      setErroMsg(r.erro);
      return false;
    }
    startTransition(() => router.refresh());
    return true;
  }

  return (
    <div className="space-y-3">
      {entregas.length === 0 ? (
        <p className="text-sm text-muted">Nenhum post combinado. Em presente sem obrigação, registre aqui quando ela postar.</p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {entregas.map((e) => {
            const atrasada = !e.publicadoEm && e.prazo && e.prazo < hoje();
            return (
              <li key={e.id} className={`space-y-2 py-3 text-sm ${excluindo === e.id ? "bg-alerta-soft" : ""}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink">{e.formato}</span>
                  {e.publicadoEm ? (
                    <span className="rounded-full bg-ok-soft px-2 py-0.5 text-xs font-semibold text-ok">publicado em {dataBR(e.publicadoEm)}</span>
                  ) : atrasada ? (
                    <span className="rounded-full bg-alerta-soft px-2 py-0.5 text-xs font-semibold text-alerta">prazo passou ({dataBR(e.prazo)})</span>
                  ) : (
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-muted">{e.prazo ? `até ${dataBR(e.prazo)}` : "sem prazo"}</span>
                  )}
                  {e.link && (
                    <a href={e.link} target="_blank" rel="noopener noreferrer" className="text-xs text-ink underline">
                      ver post ↗
                    </a>
                  )}
                  <label className="ml-auto flex items-center gap-1.5 text-xs text-muted">
                    <input type="checkbox" checked={e.sinalizou} onChange={(ev) => chamar(`${base}/${e.id}`, "PATCH", { sinalizou: ev.target.checked })} />
                    sinalizou presente/#publi
                  </label>
                  {excluindo === e.id ? (
                    <span className="flex items-center gap-2 text-xs">
                      <button type="button" onClick={() => chamar(`${base}/${e.id}`, "DELETE").then(() => setExcluindo(null))} className="font-semibold text-alerta underline">
                        Excluir
                      </button>
                      <button type="button" onClick={() => setExcluindo(null)} className="text-muted underline">
                        Cancelar
                      </button>
                    </span>
                  ) : (
                    <button type="button" onClick={() => setExcluindo(e.id)} aria-label="Excluir post combinado" title="Excluir" className={botaoIcone}>
                      <IconeLixeira />
                    </button>
                  )}
                </div>
                {e.observacao && <p className="text-xs text-muted">{e.observacao}</p>}
                {!e.link && (
                  <form
                    className="flex flex-wrap gap-2"
                    onSubmit={(ev) => {
                      ev.preventDefault();
                      void chamar(`${base}/${e.id}`, "PATCH", { link: links[e.id] ?? "" });
                    }}
                  >
                    <input
                      aria-label={`Link do ${e.formato}`}
                      type="url"
                      placeholder="Colou o link do post? Marca como publicado"
                      value={links[e.id] ?? ""}
                      onChange={(ev) => setLinks({ ...links, [e.id]: ev.target.value })}
                      className={`${campo} min-w-0 flex-1 basis-60`}
                    />
                    <button type="submit" disabled={isPending || !links[e.id]} className={botaoSecundario}>
                      Publicou
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={async (ev) => {
          ev.preventDefault();
          if (await chamar(base, "POST", novo)) setNovo({ formato: FORMATOS[0], prazo: "", observacao: "" });
        }}
      >
        <div>
          <label htmlFor={`${id}-formato`} className={rotulo}>
            Combinar post
          </label>
          <select id={`${id}-formato`} value={novo.formato} onChange={(e) => setNovo({ ...novo, formato: e.target.value })} className={campo}>
            {FORMATOS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-prazo`} className={rotulo}>
            Prazo
          </label>
          <input id={`${id}-prazo`} type="date" value={novo.prazo} onChange={(e) => setNovo({ ...novo, prazo: e.target.value })} className={campo} />
        </div>
        <div className="min-w-0 flex-1 basis-48">
          <label htmlFor={`${id}-obs`} className={rotulo}>
            Detalhe
          </label>
          <input
            id={`${id}-obs`}
            placeholder="Ex: unboxing mostrando o papel"
            value={novo.observacao}
            onChange={(e) => setNovo({ ...novo, observacao: e.target.value })}
            className={`${campo} w-full`}
          />
        </div>
        <button type="submit" disabled={isPending} className={botaoPrimario}>
          Adicionar
        </button>
      </form>
      {erroMsg && <p className="text-xs text-alerta">{erroMsg}</p>}
    </div>
  );
}
