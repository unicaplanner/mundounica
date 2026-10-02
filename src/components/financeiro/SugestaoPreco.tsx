"use client";

import { useId, useState } from "react";
import { formatarReais, normalizarNumero } from "@/lib/financeiro/formato";

// Simulador: preco sugerido = custo x multiplicador. Nada e salvo; e so
// uma conta na tela pra ajudar a decidir o preco.
export function SugestaoPreco({ custo, compacto = false }: { custo: number; compacto?: boolean }) {
  const id = useId();
  const [multiplicador, setMultiplicador] = useState("3");
  const mult = Number(normalizarNumero(multiplicador)) || 0;

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <label htmlFor={id} className={compacto ? "sr-only" : "text-muted"}>
        Multiplicador
      </label>
      <span className="text-muted" aria-hidden="true">
        ×
      </span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={multiplicador}
        onChange={(e) => setMultiplicador(e.target.value)}
        className="w-11 rounded-md border border-border bg-card px-1.5 py-1 text-center text-ink focus:border-accent-ink focus:outline-none"
      />
      <span className="whitespace-nowrap font-semibold text-ink">= {formatarReais(custo * mult)}</span>
    </div>
  );
}
