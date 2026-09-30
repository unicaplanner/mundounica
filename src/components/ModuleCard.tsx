type ModuleCardProps = {
  title: string;
  description: string;
  href?: string;
};

export function ModuleCard({ title, description, href }: ModuleCardProps) {
  const content = (
    <>
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
      {!href && (
        <span className="mt-4 inline-block rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent-ink">
          Em breve
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-[14px] border border-border bg-card p-6 shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition hover:border-accent-ink hover:shadow-[0_4px_16px_rgba(0,0,0,0.07)]"
      >
        {content}
      </a>
    );
  }

  return (
    <div className="rounded-[14px] border border-border-soft bg-card/60 p-6 opacity-70">
      {content}
    </div>
  );
}
