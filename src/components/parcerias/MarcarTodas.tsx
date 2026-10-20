"use client";

import { useRef } from "react";

// "Marcar todas" da selecao pra imprimir fichas: liga/desliga os quadradinhos
// com name="id" do formulario onde ele esta.
export function MarcarTodas() {
  const ref = useRef<HTMLInputElement>(null);

  function alternar(marcar: boolean) {
    const form = ref.current?.closest("form");
    form?.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name="id"]').forEach((c) => {
      c.checked = marcar;
    });
  }

  return (
    <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-muted">
      <input ref={ref} type="checkbox" onChange={(e) => alternar(e.target.checked)} className="h-4 w-4 rounded border-border" />
      Marcar todas
    </label>
  );
}
