import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatarReais } from "@/lib/financeiro/formato";
import { dataBR, nomeExibicao } from "@/lib/parcerias/formato";
import { COR_RECOMENDACAO, ROTULO_RECOMENDACAO, ROTULO_STATUS } from "@/lib/parcerias/rotulos";
import { NovaProposta } from "@/components/parcerias/NovaProposta";

export const dynamic = "force-dynamic";

export default async function PropostasPage() {
  const propostas = await prisma.propostaUgc.findMany({
    orderBy: { recebidaEm: "desc" },
    include: { criadora: { select: { id: true, instagram: true, tiktok: true, youtube: true, nome: true, status: true } } },
  });
  const pendentes = propostas.filter((p) => !p.recomendacao);
  const avaliadas = propostas.filter((p) => p.recomendacao);

  const linha = (p: (typeof propostas)[number]) => (
    <li key={p.id} className="space-y-1 py-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link href={`/marketing/parcerias/propostas/${p.id}`} className="font-semibold text-ink hover:underline">
          {nomeExibicao(p.criadora)}
        </Link>
        <span className="text-xs text-muted">{dataBR.format(p.recebidaEm)}</span>
        {p.pedido && (
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-ink">
            pede {p.pedido}
            {p.valorPedido && ` · ${formatarReais(p.valorPedido.toNumber())}`}
          </span>
        )}
        {p.recomendacao ? (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${COR_RECOMENDACAO[p.recomendacao]}`}>{ROTULO_RECOMENDACAO[p.recomendacao]}</span>
        ) : (
          p.analisadaPor === "claude" && <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-ink">Claude já analisou</span>
        )}
        <span className="text-xs text-muted">· {ROTULO_STATUS[p.criadora.status]}</span>
      </div>
      <p className="line-clamp-2 text-sm text-muted">{p.texto}</p>
    </li>
  );

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="font-serif text-2xl font-semibold text-ink">Propostas recebidas</h2>
        <p className="text-sm text-muted">
          Chegou proposta de parceria por DM? Cola aqui pra avaliar todas pelos mesmos critérios: estética, nicho, tom, público e o que ela pede.
        </p>
      </div>

      <NovaProposta />

      <section className="space-y-2">
        <h3 className="font-serif text-xl font-semibold text-ink">A avaliar ({pendentes.length})</h3>
        {pendentes.length === 0 ? <p className="text-sm text-muted">Nenhuma esperando.</p> : <ul className="divide-y divide-border border-y border-border">{pendentes.map(linha)}</ul>}
      </section>

      {avaliadas.length > 0 && (
        <section className="space-y-2">
          <h3 className="font-serif text-xl font-semibold text-ink">Avaliadas</h3>
          <ul className="divide-y divide-border border-y border-border">{avaliadas.map(linha)}</ul>
        </section>
      )}
    </div>
  );
}
