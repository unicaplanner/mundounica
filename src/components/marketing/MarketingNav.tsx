"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function MarketingNav() {
  const pathname = usePathname();
  const abas = [
    // as tarefas do Marketing ficam no modulo Tarefas, ja filtradas
    { href: "/tarefas?categoria=marketing&visao=lista", label: "Tarefas ↗", contador: 0 },
    { href: "/marketing/calendario", label: "Calendário" },
    { href: "/marketing/parcerias", label: "Parcerias" },
    { href: "/marketing", label: "Mapa" },
  ];

  return (
    <nav className="mb-8 flex flex-wrap gap-2 border-b border-border pb-4">
      {abas.map((aba) => {
        const ativa =
          aba.href === "/marketing"
            ? pathname === "/marketing"
            : aba.href === "/marketing/calendario"
              ? pathname.startsWith("/marketing/calendario") || pathname.startsWith("/marketing/conteudo")
              : pathname.startsWith(aba.href);
        return (
          <Link
            key={aba.href}
            href={aba.href}
            aria-current={ativa ? "page" : undefined}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              ativa ? "bg-ink text-background" : "bg-accent-soft text-ink/70 hover:bg-border"
            }`}
          >
            {aba.label}
            {!!aba.contador && (
              <span
                className={`rounded-full px-1.5 text-[11px] leading-4 ${
                  ativa ? "bg-background text-ink" : "bg-ink text-background"
                }`}
              >
                {aba.contador}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
