import Link from "next/link";
import type { Prisma, StatusCriadora } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatarReais } from "@/lib/financeiro/formato";
import { etapaPosFechar, investimento, listarCriadoras } from "@/lib/parcerias/consultas";
import { nomeExibicao } from "@/lib/parcerias/formato";
import { formatarSeguidores } from "@/lib/parcerias/perfil";
import { ROTULO_ACORDO, ROTULO_ORIGEM, STATUS, STATUS_VALIDOS } from "@/lib/parcerias/rotulos";
import { campo } from "@/components/financeiro/estilos";
import { FiltroCampanha } from "@/components/parcerias/FiltroCampanha";
import { StatusSelect } from "@/components/parcerias/StatusSelect";

export const dynamic = "force-dynamic";

export default async function CriadorasPage({ searchParams }: PageProps<"/marketing/parcerias/criadoras">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = typeof sp.status === "string" && STATUS_VALIDOS.includes(sp.status as StatusCriadora) ? (sp.status as StatusCriadora) : undefined;
  const campanhaId = typeof sp.campanha === "string" ? sp.campanha : undefined;

  const where: Prisma.CriadoraWhereInput = {
    ...(status ? { status } : {}),
    ...(campanhaId === "sem" ? { campanhaId: null } : campanhaId ? { campanhaId } : {}),
    ...(q
      ? {
          OR: ["instagram", "tiktok", "nome", "nomeCompleto", "nicho", "cupom"].map((k) => ({ [k]: { contains: q.replace(/^@/, ""), mode: "insensitive" } })),
        }
      : {}),
  };
  const [criadoras, campanhas] = await Promise.all([
    listarCriadoras(where),
    prisma.campanha.findMany({ select: { id: true, nome: true }, orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="font-serif text-2xl font-semibold text-ink">Criadoras</h2>
        <p className="text-sm text-muted">Todas, inclusive quem não seguiu. {criadoras.length} nesta lista.</p>
      </div>

      <form className="flex flex-wrap items-end gap-2" action="/marketing/parcerias/criadoras">
        <input name="q" defaultValue={q} placeholder="Buscar @, nome, nicho, cupom" className={`${campo} w-full sm:w-64`} />
        <select name="status" defaultValue={status ?? ""} className={campo} aria-label="Status">
          <option value="">Todos os status</option>
          {STATUS.map((s) => (
            <option key={s.valor} value={s.valor}>
              {s.rotulo}
            </option>
          ))}
        </select>
        {campanhaId && <input type="hidden" name="campanha" value={campanhaId} />}
        <button type="submit" className="rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-background">
          Filtrar
        </button>
      </form>
      <FiltroCampanha base="/marketing/parcerias/criadoras" campanhas={campanhas} atual={campanhaId} extra={{ q, status }} />

      {criadoras.length === 0 ? (
        <p className="text-sm text-muted">
          Ninguém encontrado. <Link href="/marketing/parcerias/nova" className="underline">Capturar um perfil</Link>
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm [&_td]:pr-4 [&_th]:pr-4">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="py-2 font-semibold">Criadora</th>
                <th className="py-2 font-semibold">Status</th>
                <th className="py-2 font-semibold">Campanha</th>
                <th className="py-2 font-semibold">Acordo</th>
                <th className="py-2 text-right font-semibold">Investido</th>
                <th className="py-2 text-right font-semibold">Vendas do cupom</th>
              </tr>
            </thead>
            <tbody>
              {criadoras.map((c) => {
                const inv = investimento(c);
                const etapa = etapaPosFechar(c);
                return (
                  <tr key={c.id} className="border-b border-border align-top">
                    <td className="py-2.5">
                      <Link href={`/marketing/parcerias/criadoras/${c.id}`} className="font-semibold text-ink hover:underline">
                        {nomeExibicao(c)}
                      </Link>
                      <span className="block text-xs text-muted">
                        {[c.nome, c.nicho, c.seguidoresInstagram && `${formatarSeguidores(c.seguidoresInstagram)} seg.`, c.origem !== "prospeccao" && ROTULO_ORIGEM[c.origem]]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <StatusSelect criadoraId={c.id} status={c.status} compacto />
                      {etapa && <span className="mt-1 block text-xs text-muted">{etapa}</span>}
                    </td>
                    <td className="py-2.5 text-xs text-muted">
                      {[c.campanha?.nome, c.lote && `Lote ${c.lote}`, c.kit].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="py-2.5 text-xs text-muted">{c.acordo ? ROTULO_ACORDO[c.acordo] : "—"}</td>
                    <td className="py-2.5 text-right tabular-nums">{inv.total > 0 ? formatarReais(inv.total) : "—"}</td>
                    <td className="py-2.5 text-right tabular-nums">
                      {c.cupom ? (
                        <>
                          {c.cupomVendas !== null ? formatarReais(c.cupomVendas.toNumber()) : "—"}
                          <span className="block text-xs text-muted">
                            {c.cupom}
                            {c.cupomPedidos !== null && ` · ${c.cupomPedidos} ped.`}
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
