import { categoria, tag } from "@/lib/tarefas/meta";

export function TagChip({ valor, ativa = true }: { valor: string; ativa?: boolean }) {
  const t = tag(valor);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        ativa ? t.cor : "text-muted ring-1 ring-border ring-inset"
      }`}
    >
      {t.rotulo}
    </span>
  );
}

export function CategoriaChip({ valor }: { valor: string }) {
  const c = categoria(valor);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ color: c.cor, backgroundColor: `color-mix(in srgb, ${c.cor} 12%, transparent)` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.cor }} />
      {c.rotulo}
    </span>
  );
}

export function Barra({ feito, total, curta = false }: { feito: number; total: number; curta?: boolean }) {
  const pct = total ? Math.round((feito / total) * 100) : 0;
  return (
    <span className="inline-flex items-center gap-2" title={`${feito} de ${total}`}>
      <span className={`block overflow-hidden rounded-full bg-border-soft ${curta ? "h-1 w-12" : "h-1.5 w-20"}`}>
        <span className={`block h-full rounded-full ${pct === 100 ? "bg-ok" : "bg-atencao"}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="text-[11px] text-muted tabular-nums">
        {feito}/{total}
      </span>
    </span>
  );
}
