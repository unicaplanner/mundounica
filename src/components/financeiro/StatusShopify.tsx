const ROTULOS: Record<string, string> = {
  DRAFT: "Rascunho no Shopify",
  ARCHIVED: "Arquivado no Shopify",
};

export function StatusShopify({ status }: { status: string | null }) {
  const rotulo = status ? ROTULOS[status] : null;
  if (!rotulo) return null;
  return (
    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-muted">{rotulo}</span>
  );
}
