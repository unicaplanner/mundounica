import { FinanceiroNav } from "@/components/financeiro/FinanceiroNav";

export default function FinanceiroLayout({ children }: LayoutProps<"/financeiro">) {
  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <h1 className="font-serif text-3xl font-semibold text-ink sm:text-4xl">Financeiro</h1>
      <p className="mt-1 mb-6 text-sm text-muted">Custo dos produtos, compras de material e preço sugerido.</p>

      <FinanceiroNav />
      {children}
    </div>
  );
}
