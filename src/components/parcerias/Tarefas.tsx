"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { IconeLixeira, botaoIcone } from "@/components/financeiro/Icones";
import { botaoPrimario, campo, rotulo } from "@/components/financeiro/estilos";

type Tarefa = { id: string; fase: string; texto: string; dica: string | null; responsavel: string | null; feita: boolean };

// Checklist da campanha, agrupado por fase.
export function Tarefas({ campanhaId, tarefas }: { campanhaId: string; tarefas: Tarefa[] }) {
  const id = useId();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feitas, setFeitas] = useState<Record<string, boolean>>(() => Object.fromEntries(tarefas.map((t) => [t.id, t.feita])));
  const fases = [...new Set(tarefas.map((t) => t.fase))];
  const [nova, setNova] = useState({ fase: fases.at(-1) ?? "Preparação", texto: "", dica: "" });
  const [erroMsg, setErroMsg] = useState<string | null>(null);
  const base = `/api/parcerias/campanhas/${campanhaId}/tarefas`;

  async function marcar(t: Tarefa, valor: boolean) {
    setFeitas((f) => ({ ...f, [t.id]: valor }));
    const r = await enviar(`${base}/${t.id}`, "PATCH", { feita: valor });
    if (!r.ok) {
      setFeitas((f) => ({ ...f, [t.id]: !valor }));
      setErroMsg(r.erro);
    }
  }

  async function chamar(url: string, method: "POST" | "DELETE", body?: unknown) {
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
    <div className="space-y-5">
      {fases.map((fase) => (
        <div key={fase} className="grid gap-2 border-t border-border pt-3 sm:grid-cols-[10rem_1fr]">
          <h4 className="text-sm font-semibold text-ink">{fase}</h4>
          <ul className="space-y-2">
            {tarefas
              .filter((t) => t.fase === fase)
              .map((t) => (
                <li key={t.id} className="group flex items-start gap-2.5">
                  <input id={`${id}-${t.id}`} type="checkbox" checked={feitas[t.id] ?? false} onChange={(e) => marcar(t, e.target.checked)} className="mt-1 h-4 w-4 shrink-0" />
                  <label htmlFor={`${id}-${t.id}`} className="min-w-0 flex-1 cursor-pointer text-sm">
                    <span className={feitas[t.id] ? "text-muted line-through" : "text-ink"}>{t.texto}</span>
                    {t.responsavel && (
                      <span className="ml-1.5 rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                        {t.responsavel === "claude" ? "Claude" : "Lari"}
                      </span>
                    )}
                    {t.dica && <span className="block text-xs text-muted">{t.dica}</span>}
                  </label>
                  <button type="button" onClick={() => chamar(`${base}/${t.id}`, "DELETE")} aria-label="Excluir tarefa" title="Excluir" className={`${botaoIcone} opacity-60 group-hover:opacity-100`}>
                    <IconeLixeira />
                  </button>
                </li>
              ))}
          </ul>
        </div>
      ))}

      <form
        className="flex flex-wrap items-end gap-2 border-t border-border pt-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await chamar(base, "POST", nova)) setNova({ ...nova, texto: "", dica: "" });
        }}
      >
        <div>
          <label htmlFor={`${id}-fase`} className={rotulo}>
            Fase
          </label>
          <input id={`${id}-fase`} list={`${id}-fases`} value={nova.fase} onChange={(e) => setNova({ ...nova, fase: e.target.value })} className={`${campo} w-40`} />
          <datalist id={`${id}-fases`}>
            {fases.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </div>
        <div className="min-w-0 flex-1 basis-56">
          <label htmlFor={`${id}-texto`} className={rotulo}>
            Nova tarefa
          </label>
          <input id={`${id}-texto`} value={nova.texto} onChange={(e) => setNova({ ...nova, texto: e.target.value })} className={`${campo} w-full`} />
        </div>
        <button type="submit" disabled={isPending || !nova.texto.trim()} className={botaoPrimario}>
          Adicionar
        </button>
      </form>
      {erroMsg && <p className="text-xs text-alerta">{erroMsg}</p>}
    </div>
  );
}
