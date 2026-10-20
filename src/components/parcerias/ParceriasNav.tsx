"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ABAS = [
  { href: "/marketing/parcerias", label: "Painel" },
  { href: "/marketing/parcerias/triagem", label: "Triagem" },
  { href: "/marketing/parcerias/criadoras", label: "Criadoras" },
  { href: "/marketing/parcerias/propostas", label: "Propostas" },
  { href: "/marketing/parcerias/campanhas", label: "Campanhas" },
  { href: "/marketing/parcerias/producao", label: "Produção dos envios" },
  { href: "/marketing/parcerias/mensagens", label: "Mensagens" },
  { href: "/marketing/parcerias/formulario", label: "Formulário" },
];

export function ParceriasNav({ producaoPendente = 0 }: { producaoPendente?: number }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Parcerias" className="mb-8 flex flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-card p-2">
      {ABAS.map((aba) => {
        const ativa = aba.href === "/marketing/parcerias" ? pathname === "/marketing/parcerias" : pathname.startsWith(aba.href);
        const contador = aba.href.endsWith("/producao") ? producaoPendente : 0;
        return (
          <Link
            key={aba.href}
            href={aba.href}
            aria-current={ativa ? "page" : undefined}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              ativa ? "bg-ink text-background" : "text-ink/70 hover:bg-accent-soft"
            }`}
          >
            {aba.label}
            {contador > 0 && (
              <span className={`rounded-full px-1.5 text-[11px] leading-4 ${ativa ? "bg-background text-ink" : "bg-ink text-background"}`}>{contador}</span>
            )}
          </Link>
        );
      })}
      <Link
        href="/marketing/parcerias/nova"
        aria-current={pathname === "/marketing/parcerias/nova" ? "page" : undefined}
        className="ml-auto rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink transition hover:opacity-90"
      >
        + Capturar perfil
      </Link>
    </nav>
  );
}
