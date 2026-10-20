"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { botaoPrimario, botaoSecundario, campo, rotulo } from "@/components/financeiro/estilos";

export type Campo = {
  chave: string;
  rotulo: string;
  tipo?: "texto" | "area" | "select" | "data" | "check" | "email" | "tel" | "url";
  valor: string | boolean;
  // como aparece fora do modo de edicao (link, numero formatado...)
  exibicao?: React.ReactNode;
  opcoes?: { valor: string; rotulo: string }[];
  placeholder?: string;
  dica?: string;
  largura?: "curta" | "media" | "inteira";
};

const LARGURA = { curta: "w-full sm:w-32", media: "w-full sm:w-56", inteira: "w-full" };

// Bloco de dados da ficha: mostra os valores e, no lapis, vira formulario.
// Manda so as chaves deste bloco (PATCH parcial).
export function EditorCampos({
  url,
  titulo,
  campos,
  vazio = "Nada preenchido ainda.",
}: {
  url: string;
  titulo?: string;
  campos: Campo[];
  vazio?: string;
}) {
  const id = useId();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState<Record<string, string | boolean>>(() => Object.fromEntries(campos.map((c) => [c.chave, c.valor])));
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  function abrir() {
    setForm(Object.fromEntries(campos.map((c) => [c.chave, c.valor])));
    setErroMsg(null);
    setEditando(true);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErroMsg(null);
    const r = await enviar(url, "PATCH", form);
    if (!r.ok) {
      setErroMsg(r.erro);
      return;
    }
    setEditando(false);
    startTransition(() => router.refresh());
  }

  if (!editando) {
    const preenchidos = campos.filter((c) => (c.tipo === "check" ? c.valor : String(c.valor).trim()));
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          {titulo && <h3 className="text-sm font-semibold text-ink">{titulo}</h3>}
          <button type="button" onClick={abrir} className={botaoSecundario}>
            Editar
          </button>
        </div>
        {preenchidos.length === 0 ? (
          <p className="text-sm text-muted">{vazio}</p>
        ) : (
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[minmax(0,10rem)_1fr]">
            {preenchidos.map((c) => (
              <div key={c.chave} className="contents">
                <dt className="text-xs text-muted sm:pt-0.5">{c.rotulo}</dt>
                <dd className="min-w-0 whitespace-pre-line break-words text-ink">
                  {c.exibicao ?? (c.tipo === "check" ? "Sim" : c.opcoes ? (c.opcoes.find((o) => o.valor === c.valor)?.rotulo ?? String(c.valor)) : String(c.valor))}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={salvar} className="space-y-3 rounded-xl bg-accent-soft/50 p-4">
      {titulo && <h3 className="text-sm font-semibold text-ink">{titulo}</h3>}
      <div className="flex flex-wrap gap-3">
        {campos.map((c) => {
          const cid = `${id}-${c.chave}`;
          const largura = LARGURA[c.largura ?? (c.tipo === "area" ? "inteira" : "media")];
          if (c.tipo === "check") {
            return (
              <label key={c.chave} htmlFor={cid} className="flex w-full items-center gap-2 text-sm text-ink">
                <input id={cid} type="checkbox" checked={Boolean(form[c.chave])} onChange={(e) => setForm({ ...form, [c.chave]: e.target.checked })} />
                {c.rotulo}
              </label>
            );
          }
          return (
            <div key={c.chave} className={c.tipo === "area" || c.largura === "inteira" ? "w-full" : ""}>
              <label htmlFor={cid} className={rotulo}>
                {c.rotulo}
              </label>
              {c.tipo === "area" ? (
                <textarea
                  id={cid}
                  rows={3}
                  placeholder={c.placeholder}
                  value={String(form[c.chave] ?? "")}
                  onChange={(e) => setForm({ ...form, [c.chave]: e.target.value })}
                  className={`${campo} ${largura}`}
                />
              ) : c.tipo === "select" ? (
                <select id={cid} value={String(form[c.chave] ?? "")} onChange={(e) => setForm({ ...form, [c.chave]: e.target.value })} className={`${campo} ${largura}`}>
                  {c.opcoes?.map((o) => (
                    <option key={o.valor} value={o.valor}>
                      {o.rotulo}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={cid}
                  type={c.tipo === "data" ? "date" : c.tipo === "email" ? "email" : c.tipo === "url" ? "url" : "text"}
                  inputMode={c.tipo === "tel" ? "tel" : undefined}
                  placeholder={c.placeholder}
                  value={String(form[c.chave] ?? "")}
                  onChange={(e) => setForm({ ...form, [c.chave]: e.target.value })}
                  className={`${campo} ${largura}`}
                />
              )}
              {c.dica && <p className="mt-1 text-xs text-muted">{c.dica}</p>}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={isPending} className={botaoPrimario}>
          Salvar
        </button>
        <button type="button" onClick={() => setEditando(false)} className={botaoSecundario}>
          Cancelar
        </button>
        {erroMsg && <span className="text-xs text-alerta">{erroMsg}</span>}
      </div>
    </form>
  );
}
