import Link from "next/link";

type ModuleCardProps = {
  title: string;
  description: string;
  monogram: string;
  href?: string;
  variant: "active" | "ghost";
  className?: string;
};

export function ModuleCard({
  title,
  description,
  monogram,
  href,
  variant,
  className = "",
}: ModuleCardProps) {
  if (variant === "active") {
    const classes = `flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-ink px-6 py-5 text-background transition hover:opacity-95 ${className}`;
    const conteudo = (
      <>
        <div className="flex items-center gap-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent font-serif text-base font-semibold text-accent-ink">
            {monogram}
          </span>
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-background/70">{description}</p>
          </div>
        </div>
        {href && <span className="whitespace-nowrap text-sm font-semibold text-accent">Abrir →</span>}
      </>
    );

    // Modulo do proprio Mundo da Unica abre na mesma aba; sistema externo
    // (ex: Central de Producao, com login proprio) abre em aba nova.
    if (href?.startsWith("/")) {
      return (
        <Link href={href} className={classes}>
          {conteudo}
        </Link>
      );
    }
    if (href) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
          {conteudo}
        </a>
      );
    }
    return <div className={classes}>{conteudo}</div>;
  }

  return (
    <div className={`flex flex-col gap-3 rounded-2xl border border-dashed border-border p-5 ${className}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft font-serif text-base font-semibold text-muted">
        {monogram}
      </span>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <p className="text-sm text-muted">{description}</p>
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">Em breve</span>
    </div>
  );
}
