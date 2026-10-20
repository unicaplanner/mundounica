"use client";

import Link from "next/link";

// Barra que so aparece na tela (some ao imprimir): botao de imprimir e voltar.
export function PrintToolbar({ voltarHref, titulo }: { voltarHref: string; titulo: string }) {
  return (
    <div className="no-print sticky top-0 z-10 border-b border-border bg-card px-4 py-3">
      <div className="mx-auto flex max-w-[148mm] flex-wrap items-center justify-between gap-3">
        <Link href={voltarHref} className="text-sm text-muted hover:text-ink">
          ← Voltar
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">{titulo} · papel A5 (já configurado)</span>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full bg-ink px-4 py-1.5 text-xs font-semibold text-background hover:opacity-90"
          >
            Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}
