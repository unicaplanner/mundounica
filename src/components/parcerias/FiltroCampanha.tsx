import Link from "next/link";

// Pilulas de filtro por campanha (links, sem JS).
export function FiltroCampanha({
  base,
  campanhas,
  atual,
  extra = {},
}: {
  base: string;
  campanhas: { id: string; nome: string }[];
  atual: string | undefined;
  extra?: Record<string, string | undefined>;
}) {
  if (campanhas.length === 0) return null;
  const href = (campanha?: string) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v);
    if (campanha) p.set("campanha", campanha);
    const q = p.toString();
    return q ? `${base}?${q}` : base;
  };
  const pilula = (ativa: boolean) =>
    `rounded-full px-3 py-1 text-xs font-semibold ${ativa ? "bg-accent text-accent-ink" : "border border-border text-muted hover:text-ink"}`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted">Campanha:</span>
      <Link href={href()} className={pilula(!atual)}>
        Todas
      </Link>
      {campanhas.map((c) => (
        <Link key={c.id} href={href(c.id)} className={pilula(atual === c.id)}>
          {c.nome}
        </Link>
      ))}
      <Link href={href("sem")} className={pilula(atual === "sem")}>
        Sem campanha
      </Link>
    </div>
  );
}
