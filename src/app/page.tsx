import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <header className="mb-12 flex items-center justify-between">
        <p className="brand-mark text-sm text-accent-ink">Mundo da Unica</p>
        <LogoutButton />
      </header>

      <p className="mb-8 text-sm text-muted">
        Um lugar so para abrir as ferramentas da Unica Planner.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ModuleCard
          title="Central de Produção"
          description="Pedidos abertos do Shopify, agrupados e priorizados para produção."
          href={CENTRAL_PRODUCAO_URL}
        />
        <ModuleCard
          title="Leads de criadoras"
          description="Prospecção e triagem de criadoras para parcerias."
        />
        <ModuleCard
          title="Propostas de UGC"
          description="Avaliação de propostas de parceria recebidas por DM."
        />
        <ModuleCard
          title="Feedbacks e ideias de produto"
          description="Feedbacks de canais variados, organizados por ideia."
        />
      </div>
    </div>
  );
}
