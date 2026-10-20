import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { contarPendentes } from "@/lib/marketing/tarefas";

export default async function MarketingLayout({ children }: LayoutProps<"/marketing">) {
  const pendentes = await contarPendentes();

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-12">
      <header className="mb-10 flex items-center justify-between">
        <Link href="/" className="brand-mark text-sm text-accent-ink hover:text-ink">
          Mundo da Unica
        </Link>
        <LogoutButton />
      </header>

      <h1 className="font-serif text-3xl font-semibold text-ink sm:text-4xl">Marketing</h1>
      <p className="mt-1 mb-6 text-sm text-muted">Mapa, calendário de conteúdo, parcerias com criadoras e o que depende de você.</p>

      <MarketingNav pendentes={pendentes} />
      {children}
    </div>
  );
}
