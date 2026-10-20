"use client";

import type { StatusCriadora } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { COR_STATUS, STATUS } from "@/lib/parcerias/rotulos";

// Muda o status da criadora direto da lista, do quadro ou da ficha.
export function StatusSelect({ criadoraId, status, compacto = false }: { criadoraId: string; status: StatusCriadora; compacto?: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [valor, setValor] = useState(status);
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  async function mudar(novo: StatusCriadora) {
    const anterior = valor;
    setValor(novo);
    setErroMsg(null);
    const r = await enviar(`/api/parcerias/criadoras/${criadoraId}`, "PATCH", { status: novo });
    if (!r.ok) {
      setValor(anterior);
      setErroMsg(r.erro);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <select
        aria-label="Status"
        value={valor}
        disabled={isPending}
        onChange={(e) => mudar(e.target.value as StatusCriadora)}
        className={`rounded-full border-0 font-semibold focus:outline-2 focus:outline-accent-ink ${COR_STATUS[valor]} ${compacto ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs"}`}
      >
        {STATUS.map((s) => (
          <option key={s.valor} value={s.valor}>
            {s.rotulo}
          </option>
        ))}
      </select>
      {erroMsg && <span className="text-xs text-alerta">{erroMsg}</span>}
    </span>
  );
}
