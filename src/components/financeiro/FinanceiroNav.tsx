"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ABAS = [
  { href: "/financeiro", label: "Produtos" },
  { href: "/financeiro/precificacao", label: "Precificação" },
  { href: "/financeiro/calculadora", label: "Calculadora" },
  { href: "/financeiro/custos", label: "Custos fixos" },
  { href: "/financeiro/envio", label: "Envio" },
  { href: "/financeiro/materiais", label: "Materiais" },
  { href: "/financeiro/compras", label: "Compras" },
  { href: "/financeiro/impressoras", label: "Impressoras" },
];

export function FinanceiroNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-8 flex flex-wrap gap-2 border-b border-border pb-4">
      {ABAS.map((aba) => {
        const ativa =
          aba.href === "/financeiro"
            ? pathname === "/financeiro" || pathname.startsWith("/financeiro/produtos")
            : pathname.startsWith(aba.href);
        return (
          <Link
            key={aba.href}
            href={aba.href}
            aria-current={ativa ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              ativa ? "bg-ink text-background" : "bg-accent-soft text-ink/70 hover:bg-border"
            }`}
          >
            {aba.label}
          </Link>
        );
      })}
    </nav>
  );
}
