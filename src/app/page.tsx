import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getGreeting } from "@/lib/greeting";
import { LogoutButton } from "@/components/LogoutButton";
import { ModuleCard } from "@/components/ModuleCard";

const CENTRAL_PRODUCAO_URL = process.env.NEXT_PUBLIC_CENTRAL_PRODUCAO_URL;

export default async function HubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { greeting, dateLabel } = getGreeting();

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <header className="mb-10 flex items-center justify-between">
        <p className="brand-mark text-sm text-accent-ink">Mundo da Unica</p>
        <LogoutButton />
      </header>

      <h1 className="font-serif text-3xl font-semibold text-ink sm:text-4xl">
        {greeting}, Lari
      </h1>
      <p className="mt-1 mb-8 text-sm text-muted">{dateLabel}</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
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
          className="sm:col-span-2"
          variant="ghost"
          monogram="LC"
          title="Leads de criadoras"
          description="Prospecção e triagem de criadoras para parcerias."
        />
        <ModuleCard
          className="sm:col-span-2"
          variant="ghost"
          monogram="UG"
          title="Propostas de UGC"
          description="Avaliação de propostas de parceria recebidas por DM."
        />
        <ModuleCard
          className="sm:col-span-2"
          variant="ghost"
          monogram="FI"
          title="Feedbacks e ideias de produto"
          description="Feedbacks de canais variados, organizados por ideia."
        />
      </div>
    </div>
  );
}
