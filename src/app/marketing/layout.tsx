import { MarketingNav } from "@/components/marketing/MarketingNav";

export default function MarketingLayout({ children }: LayoutProps<"/marketing">) {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-12">
      <h1 className="font-serif text-3xl font-semibold text-ink sm:text-4xl">Marketing</h1>
      <p className="mt-1 mb-6 text-sm text-muted">Mapa, calendário de conteúdo, parcerias com criadoras e o que depende de você.</p>

      <MarketingNav />
      {children}
    </div>
  );
}
