import Link from "next/link";
import { prisma } from "@/lib/db";
import { listarCriadoras } from "@/lib/parcerias/consultas";
import { haQuanto, nomeExibicao } from "@/lib/parcerias/formato";
import { formatarSeguidores } from "@/lib/parcerias/perfil";
import { ROTULO_STATUS, STATUS_QUADRO } from "@/lib/parcerias/rotulos";
import { FiltroCampanha } from "@/components/parcerias/FiltroCampanha";
import { StatusSelect } from "@/components/parcerias/StatusSelect";

export const dynamic = "force-dynamic";

export default async function TriagemPage({ searchParams }: PageProps<"/marketing/parcerias/triagem">) {
  const { campanha } = await searchParams;
  const campanhaId = typeof campanha === "string" ? campanha : undefined;
  const [criadoras, campanhas] = await Promise.all([
    listarCriadoras({
      status: { in: STATUS_QUADRO },
      ...(campanhaId === "sem" ? { campanhaId: null } : campanhaId ? { campanhaId } : {}),
    }),
    prisma.campanha.findMany({ select: { id: true, nome: true }, orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="font-serif text-2xl font-semibold text-ink">Triagem</h2>
        <p className="text-sm text-muted">
          Abra cada &quot;não revisada&quot;, anote o nicho e por que achou interessante, e mova pelo status. Quem não seguiu sai do quadro (fica em Criadoras).
        </p>
      </div>
      <FiltroCampanha base="/marketing/parcerias/triagem" campanhas={campanhas} atual={campanhaId} />

      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        <div className="grid min-w-[1080px] grid-cols-6 gap-3">
          {STATUS_QUADRO.map((status) => {
            const coluna = criadoras.filter((c) => c.status === status).sort((a, b) => a.statusEm.getTime() - b.statusEm.getTime());
            return (
              <section key={status} aria-label={ROTULO_STATUS[status]} className="flex flex-col gap-2 rounded-2xl bg-accent-soft/50 p-2.5">
                <h3 className="flex items-center justify-between px-1 text-xs font-semibold text-ink">
                  {ROTULO_STATUS[status]}
                  <span className="tabular-nums text-muted">{coluna.length}</span>
                </h3>
                {coluna.length === 0 && <p className="px-1 py-3 text-xs text-muted">Ninguém aqui.</p>}
                {coluna.map((c) => (
                  <article key={c.id} className="space-y-1.5 rounded-xl border border-border bg-card p-3 text-xs">
                    <Link href={`/marketing/parcerias/criadoras/${c.id}`} className="block break-all text-sm font-semibold text-ink hover:underline">
                      {nomeExibicao(c)}
                    </Link>
                    {(c.nicho || c.seguidoresInstagram) && (
                      <p className="text-muted">
                        {[c.nicho, c.seguidoresInstagram && `${formatarSeguidores(c.seguidoresInstagram)} seg.`].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {c.motivo && <p className="line-clamp-3 text-ink/80">{c.motivo}</p>}
                    {c.alerta && <p className="rounded bg-atencao-soft px-1.5 py-0.5 text-atencao">{c.alerta}</p>}
                    <div className="flex flex-wrap gap-1">
                      {c.origem === "proposta" && <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-ink">mandou proposta</span>}
                      {c.campanha && <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted">{c.campanha.nome}</span>}
                    </div>
                    <div className="flex items-center justify-between gap-1 pt-1">
                      <StatusSelect criadoraId={c.id} status={c.status} compacto />
                      <span className="text-[10px] text-muted">{haQuanto(c.statusEm)}</span>
                    </div>
                  </article>
                ))}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
