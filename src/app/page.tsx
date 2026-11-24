import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getGreeting } from "@/lib/greeting";
import { LogoutButton } from "@/components/LogoutButton";
import { ModuleCard } from "@/components/ModuleCard";
import { buscar } from "@/lib/busca";

const CENTRAL_PRODUCAO_URL = process.env.NEXT_PUBLIC_CENTRAL_PRODUCAO_URL;

export const dynamic = "force-dynamic";

export default async function HubPage({ searchParams }: PageProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { greeting, dateLabel } = getGreeting();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const grupos = q ? await buscar(q) : [];

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <header className="mb-10 flex items-center justify-between">
        <p className="brand-mark text-sm text-accent-ink">Mundo da Unica</p>
        <LogoutButton />
      </header>

      <h1 className="font-serif text-3xl font-semibold text-ink sm:text-4xl">
        {greeting}, Lari
      </h1>
      <p className="mt-1 mb-6 text-sm text-muted">{dateLabel}</p>

      <form action="/" method="get" role="search" className="mb-8 flex gap-2">
        <label htmlFor="busca" className="sr-only">
          Buscar no Mundo da Unica
        </label>
        <input
          id="busca"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Buscar produto, material, fornecedor, conteúdo, criadora, tarefa…"
          className="min-w-0 flex-1 rounded-full border border-border bg-card px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none"
        />
        <button type="submit" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-background hover:opacity-90">
          Buscar
        </button>
      </form>

      {q && (
        <section aria-label="Resultados da busca" className="mb-10 space-y-5">
          {q.length < 2 ? (
            <p className="text-sm text-muted">Digite pelo menos 2 letras.</p>
          ) : grupos.length === 0 ? (
            <p className="text-sm text-muted">
              Nada encontrado para <strong className="text-ink">{q}</strong>.
            </p>
          ) : (
            grupos.map((g) => (
              <div key={g.rotulo}>
                <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                  {g.rotulo} <span className="font-normal normal-case">· {g.modulo}</span>
                </h2>
                <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
                  {g.itens.map((i) => (
                    <li key={i.href + i.titulo}>
                      <Link href={i.href} className="flex flex-wrap items-baseline justify-between gap-x-3 px-4 py-2.5 text-sm hover:bg-accent-soft">
                        <span className="font-semibold text-ink">{i.titulo}</span>
                        {i.detalhe && <span className="text-xs text-muted">{i.detalhe}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
                {g.mais && <p className="mt-1 text-xs text-muted">Tem mais: refine a busca.</p>}
              </div>
            ))
          )}
          <Link href="/" className="inline-block text-xs text-muted underline hover:text-ink">
            Limpar busca
          </Link>
        </section>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
        <ModuleCard
          className="sm:col-span-6"
          variant="active"
          monogram="TF"
          title="Tarefas"
          description="O que fazer hoje: aprovações, envios, compras e tudo que os outros módulos pedem, em lista, kanban ou calendário."
          href="/tarefas"
        />
        <ModuleCard
          className="sm:col-span-3"
          variant="active"
          monogram="CP"
          title="Central de Produção"
          description="Pedidos abertos do Shopify, agrupados e priorizados para produção."
          href={CENTRAL_PRODUCAO_URL}
        />
        <ModuleCard
          className="sm:col-span-3"
          variant="active"
          monogram="FN"
          title="Financeiro"
          description="Custo dos produtos, compras de material e preço sugerido."
          href="/financeiro"
        />
        <ModuleCard
          className="sm:col-span-3"
          variant="active"
          monogram="MK"
          title="Marketing"
          description="Conteúdo, calendário e parcerias com criadoras: da captura no feed ao envio e às vendas do cupom."
          href="/marketing"
        />
        <ModuleCard
          className="sm:col-span-3"
          variant="ghost"
          monogram="FI"
          title="Feedbacks e ideias de produto"
          description="Feedbacks de canais variados, organizados por ideia."
        />
      </div>
    </div>
  );
}
