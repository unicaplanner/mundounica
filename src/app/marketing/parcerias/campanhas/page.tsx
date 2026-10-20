import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatarReais } from "@/lib/financeiro/formato";
import { etapaPosFechar, investimento, listarCriadoras } from "@/lib/parcerias/consultas";
import { dataCurta } from "@/lib/parcerias/formato";
import { NovaCampanha } from "@/components/parcerias/NovaCampanha";

export const dynamic = "force-dynamic";

export default async function CampanhasPage() {
  const [campanhas, criadoras] = await Promise.all([
    prisma.campanha.findMany({
      orderBy: { createdAt: "desc" },
      include: { tarefas: { select: { feita: true } } },
    }),
    listarCriadoras({ campanhaId: { not: null } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-serif text-2xl font-semibold text-ink">Campanhas</h2>
        <p className="text-sm text-muted">Cada onda de envios, com o checklist do que fazer e o resultado.</p>
      </div>
      <NovaCampanha />
      {campanhas.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma campanha ainda.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {campanhas.map((camp) => {
            const delas = criadoras.filter((c) => c.campanhaId === camp.id);
            const etapas = delas.map(etapaPosFechar);
            const investido = delas.reduce((a, c) => a + investimento(c).total, 0);
            const vendas = delas.reduce((a, c) => a + (c.cupomVendas?.toNumber() ?? 0), 0);
            const feitas = camp.tarefas.filter((t) => t.feita).length;
            return (
              <Link key={camp.id} href={`/marketing/parcerias/campanhas/${camp.id}`} className="space-y-2 rounded-2xl border border-border bg-card p-4 transition hover:border-accent-ink">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-serif text-xl font-semibold text-ink">{camp.nome}</h3>
                  {camp.inicio && (
                    <span className="text-xs text-muted">
                      {dataCurta.format(camp.inicio)}
                      {camp.fim && ` a ${dataCurta.format(camp.fim)}`}
                    </span>
                  )}
                </div>
                {camp.descricao && <p className="text-sm text-muted">{camp.descricao}</p>}
                <p className="text-sm text-ink">
                  {delas.length} criadoras · {etapas.filter((e) => e && e !== "Falta enviar").length} enviados ·{" "}
                  {etapas.filter((e) => e === "Postou" || e === "Vendeu").length} postaram · {etapas.filter((e) => e === "Vendeu").length} venderam
                </p>
                <p className="text-xs tabular-nums text-muted">
                  investido {formatarReais(investido)} · vendas {formatarReais(vendas)}
                  {camp.tarefas.length > 0 && ` · tarefas ${feitas}/${camp.tarefas.length}`}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
