"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { enviar } from "@/lib/financeiro/enviar";

// Quadradinho de "feito" de um item da producao dos envios (mesmo jeito do
// "Marcar como produzido" da Central de Producao): marca na hora e desfaz se
// a rota falhar.
export function ItemProducao({ id, feito, children }: { id: string; feito: boolean; children: React.ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [marcado, setMarcado] = useState(feito);
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  async function alternar() {
    const novo = !marcado;
    setMarcado(novo);
    setErroMsg(null);
    const r = await enviar(`/api/parcerias/producao/${id}`, "PATCH", { feito: novo });
    if (!r.ok) {
      setMarcado(!novo);
      setErroMsg(r.erro);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <label className="flex cursor-pointer select-none items-start gap-2.5 py-1.5 text-sm">
      <input
        type="checkbox"
        checked={marcado}
        onChange={alternar}
        disabled={isPending}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-[var(--ok)]"
      />
      <span className={`min-w-0 ${marcado ? "text-muted line-through" : "text-ink"}`}>
        {children}
        {erroMsg && <span className="ml-2 text-xs text-alerta no-underline">{erroMsg}</span>}
      </span>
    </label>
  );
}
