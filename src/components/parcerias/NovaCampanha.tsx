"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { botaoPrimario, campo, rotulo } from "@/components/financeiro/estilos";

export function NovaCampanha() {
  const id = useId();
  const router = useRouter();
  const [form, setForm] = useState({ nome: "", inicio: "", fim: "", descricao: "" });
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErroMsg(null);
    const r = await enviar("/api/parcerias/campanhas", "POST", form);
    if (!r.ok) {
      setErroMsg(r.erro);
      return;
    }
    router.push(`/marketing/parcerias/campanhas/${r.dados.id}`);
  }

  return (
    <form onSubmit={salvar} className="flex flex-wrap items-end gap-2 rounded-2xl border border-border bg-card p-4">
      <div>
        <label htmlFor={`${id}-nome`} className={rotulo}>
          Nova campanha
        </label>
        <input id={`${id}-nome`} placeholder="Onda 2" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className={`${campo} w-40`} />
      </div>
      <div>
        <label htmlFor={`${id}-inicio`} className={rotulo}>
          Início
        </label>
        <input id={`${id}-inicio`} type="date" value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} className={campo} />
      </div>
      <div>
        <label htmlFor={`${id}-fim`} className={rotulo}>
          Fim
        </label>
        <input id={`${id}-fim`} type="date" value={form.fim} onChange={(e) => setForm({ ...form, fim: e.target.value })} className={campo} />
      </div>
      <div className="min-w-0 flex-1 basis-56">
        <label htmlFor={`${id}-desc`} className={rotulo}>
          Objetivo
        </label>
        <input
          id={`${id}-desc`}
          placeholder="Ex: seeding antes da Black Friday"
          value={form.descricao}
          onChange={(e) => setForm({ ...form, descricao: e.target.value })}
          className={`${campo} w-full`}
        />
      </div>
      <button type="submit" disabled={!form.nome.trim()} className={botaoPrimario}>
        Criar
      </button>
      {erroMsg && <p className="w-full text-xs text-alerta">{erroMsg}</p>}
    </form>
  );
}
