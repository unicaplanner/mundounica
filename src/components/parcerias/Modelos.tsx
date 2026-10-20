"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { botaoPrimario, botaoSecundario, campo, rotulo } from "@/components/financeiro/estilos";
import { Copiar } from "./Copiar";

type Modelo = { id: string; titulo: string; texto: string };

function ModeloItem({ m }: { m: Modelo }) {
  const id = useId();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ titulo: m.titulo, texto: m.texto });
  const [excluindo, setExcluindo] = useState(false);
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  async function chamar(method: "PATCH" | "DELETE") {
    setErroMsg(null);
    const r = await enviar(`/api/parcerias/modelos/${m.id}`, method, method === "PATCH" ? form : undefined);
    if (!r.ok) {
      setErroMsg(r.erro);
      return;
    }
    setEditando(false);
    startTransition(() => router.refresh());
  }

  return (
    <li className="space-y-2 rounded-2xl border border-border bg-card p-4">
      {editando ? (
        <>
          <label htmlFor={`${id}-t`} className={rotulo}>
            Título
          </label>
          <input id={`${id}-t`} value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className={`${campo} w-full sm:w-72`} />
          <label htmlFor={`${id}-x`} className={rotulo}>
            Texto
          </label>
          <textarea id={`${id}-x`} rows={10} value={form.texto} onChange={(e) => setForm({ ...form, texto: e.target.value })} className={`${campo} w-full leading-relaxed`} />
          <div className="flex gap-2">
            <button type="button" disabled={isPending} onClick={() => chamar("PATCH")} className={botaoPrimario}>
              Salvar
            </button>
            <button type="button" onClick={() => setEditando(false)} className={botaoSecundario}>
              Cancelar
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-ink">{m.titulo}</h3>
            <span className="ml-auto flex flex-wrap items-center gap-2">
              <Copiar texto={m.texto} />
              <button type="button" onClick={() => setEditando(true)} className={botaoSecundario}>
                Editar
              </button>
              {excluindo ? (
                <span className="flex items-center gap-2 text-xs">
                  <button type="button" onClick={() => chamar("DELETE")} className="font-semibold text-alerta underline">
                    Excluir
                  </button>
                  <button type="button" onClick={() => setExcluindo(false)} className="text-muted underline">
                    Cancelar
                  </button>
                </span>
              ) : (
                <button type="button" onClick={() => setExcluindo(true)} className="text-xs text-muted underline hover:text-alerta">
                  Excluir
                </button>
              )}
            </span>
          </div>
          <p className="whitespace-pre-line text-sm text-ink/80">{m.texto}</p>
        </>
      )}
      {erroMsg && <p className="text-xs text-alerta">{erroMsg}</p>}
    </li>
  );
}

export function Modelos({ modelos }: { modelos: Modelo[] }) {
  const id = useId();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({ titulo: "", texto: "" });
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErroMsg(null);
    const r = await enviar("/api/parcerias/modelos", "POST", form);
    if (!r.ok) {
      setErroMsg(r.erro);
      return;
    }
    setForm({ titulo: "", texto: "" });
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {modelos.map((m) => (
          <ModeloItem key={m.id} m={m} />
        ))}
      </ul>
      <form onSubmit={criar} className="space-y-2 rounded-2xl border border-dashed border-border p-4">
        <h3 className="text-sm font-semibold text-ink">Novo modelo</h3>
        <label htmlFor={`${id}-t`} className={rotulo}>
          Título
        </label>
        <input id={`${id}-t`} placeholder="Ex: Lembrete 5 dias depois" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className={`${campo} w-full sm:w-72`} />
        <label htmlFor={`${id}-x`} className={rotulo}>
          Texto
        </label>
        <textarea id={`${id}-x`} rows={6} value={form.texto} onChange={(e) => setForm({ ...form, texto: e.target.value })} className={`${campo} w-full`} />
        <button type="submit" disabled={isPending} className={botaoPrimario}>
          Criar modelo
        </button>
        {erroMsg && <p className="text-xs text-alerta">{erroMsg}</p>}
      </form>
    </div>
  );
}
