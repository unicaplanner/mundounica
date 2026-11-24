"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const CENTRAL_PRODUCAO_URL = process.env.NEXT_PUBLIC_CENTRAL_PRODUCAO_URL;

type Item = { href: string; rotulo: string; monograma: string; externo?: boolean };

const MODULOS: Item[] = [
  { href: "/", rotulo: "Início", monograma: "MU" },
  { href: "/tarefas", rotulo: "Tarefas", monograma: "TF" },
  ...(CENTRAL_PRODUCAO_URL ? [{ href: CENTRAL_PRODUCAO_URL, rotulo: "Central de Produção", monograma: "CP", externo: true }] : []),
  { href: "/financeiro", rotulo: "Financeiro", monograma: "FN" },
  { href: "/marketing", rotulo: "Marketing", monograma: "MK" },
];

// Telas sem menu: login e as paginas de impressao.
const SEM_MENU = ["/login", "/auth", "/imprimir"];

function Links({ aoClicar }: { aoClicar?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-1">
      {MODULOS.map((m) => {
        const ativo = !m.externo && (m.href === "/" ? pathname === "/" : pathname.startsWith(m.href));
        const classe = `flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${
          ativo ? "bg-ink font-semibold text-background" : "text-ink/80 hover:bg-accent-soft"
        }`;
        const conteudo = (
          <>
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-serif text-xs font-semibold ${
                ativo ? "bg-accent text-accent-ink" : "bg-accent-soft text-accent-ink"
              }`}
            >
              {m.monograma}
            </span>
            {m.rotulo}
            {m.externo && <span className="ml-auto text-xs text-muted">↗</span>}
          </>
        );
        return (
          <li key={m.href}>
            {m.externo ? (
              <a href={m.href} target="_blank" rel="noopener noreferrer" className={classe} onClick={aoClicar}>
                {conteudo}
              </a>
            ) : (
              <Link href={m.href} className={classe} aria-current={ativo ? "page" : undefined} onClick={aoClicar}>
                {conteudo}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function MenuLateral() {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  if (SEM_MENU.some((p) => pathname.startsWith(p))) return null;

  return (
    <>
      {/* celular: barra no topo com botao que abre o menu */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur md:hidden print:hidden">
        <Link href="/" className="brand-mark text-sm text-accent-ink">
          Mundo da Unica
        </Link>
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          aria-expanded={aberto}
          aria-controls="menu-modulos"
          className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-ink"
        >
          {aberto ? "Fechar" : "Módulos"}
        </button>
      </div>
      {aberto && (
        <nav id="menu-modulos" aria-label="Módulos" className="border-b border-border bg-background px-4 py-3 md:hidden print:hidden">
          <Links aoClicar={() => setAberto(false)} />
        </nav>
      )}

      {/* computador: coluna fixa a esquerda */}
      <nav
        aria-label="Módulos"
        className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col gap-6 border-r border-border px-3 py-8 md:flex print:hidden"
      >
        <Link href="/" className="brand-mark px-3 text-sm text-accent-ink hover:text-ink">
          Mundo da Unica
        </Link>
        <Links />
      </nav>
    </>
  );
}
