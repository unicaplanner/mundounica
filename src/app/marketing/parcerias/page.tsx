import Link from "next/link";
import { formatarReais } from "@/lib/financeiro/formato";
import { carregarPainel } from "@/lib/parcerias/consultas";
import { haQuanto, nomeExibicao } from "@/lib/parcerias/formato";
import { DIAS_LEMBRETE, STATUS } from "@/lib/parcerias/rotulos";
import { BotaoAcao } from "@/components/parcerias/BotaoAcao";

export const dynamic = "force-dynamic";

function Pendencia({ titulo, href, itens, vazio }: { titulo: string; href?: string; itens: { id: string; rotulo: string; detalhe?: string }[]; vazio?: boolean }) {
  if (itens.length === 0 && !vazio) return null;
  return (
    <div className="space-y-1.5 rounded-xl border border-border bg-card px-4 py-3">
      <h4 className="flex items-baseline justify-between gap-2 text-sm font-semibold text-ink">
        {href ? (
          <Link href={href} className="hover:underline">
            {titulo}
          </Link>
        ) : (
          titulo
        )}
        <span className="tabular-nums text-muted">{itens.length}</span>
      </h4>
      <ul className="space-y-0.5 text-sm">
        {itens.slice(0, 6).map((i) => (
          <li key={i.id} className="flex justify-between gap-2">
            <Link href={`/marketing/parcerias/criadoras/${i.id}`} className="truncate text-ink/80 hover:underline">
              {i.rotulo}
            </Link>
            {i.detalhe && <span className="shrink-0 text-xs text-muted">{i.detalhe}</span>}
          </li>
        ))}
        {itens.length > 6 && <li className="text-xs text-muted">e mais {itens.length - 6}</li>}
      </ul>
    </div>
  );
}

export default async function ParceriasPainelPage() {
  const p = await carregarPainel();
  const retorno = p.investido > 0 ? p.vendas / p.investido : null;

  if (p.total === 0) {
    return (
      <div className="space-y-3 rounded-2xl border border-dashed border-border p-6">
        <h2 className="font-serif text-2xl font-semibold text-ink">Comece pela captura</h2>
        <p className="text-sm text-muted">Achou uma criadora interessante? Cole o link do perfil. Recebeu proposta por DM? Cole a mensagem em Propostas.</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/marketing/parcerias/nova" className="rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-background">
            Capturar perfil
          </Link>
          <Link href="/marketing/parcerias/propostas" className="rounded-full bg-accent-soft px-4 py-1.5 text-sm font-semibold text-ink">
            Nova proposta
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="font-serif text-2xl font-semibold text-ink">Funil</h2>
        <div className="flex flex-wrap gap-2">
          {STATUS.map((s) => (
            <Link key={s.valor} href={`/marketing/parcerias/criadoras?status=${s.valor}`} className={`rounded-xl px-3 py-2 text-xs font-semibold ${s.cor} hover:opacity-90`}>
              <span className="block font-serif text-xl tabular-nums">{p.porStatus.get(s.valor) ?? 0}</span>
              {s.rotulo}
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl font-semibold text-ink">Pra fazer agora</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {p.naoRevisadas > 0 && (
            <Link href="/marketing/parcerias/triagem" className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-ink hover:bg-border">
              <b className="font-serif text-xl tabular-nums">{p.naoRevisadas}</b> perfis capturados esperando triagem →
            </Link>
          )}
          {p.propostasPendentes > 0 && (
            <Link href="/marketing/parcerias/propostas" className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-ink hover:bg-border">
              <b className="font-serif text-xl tabular-nums">{p.propostasPendentes}</b> propostas recebidas pra avaliar →
            </Link>
          )}
          {p.respostasSoltas > 0 && (
            <Link href="/marketing/parcerias/formulario" className="rounded-xl bg-atencao-soft px-4 py-3 text-sm text-atencao">
              <b className="font-serif text-xl tabular-nums">{p.respostasSoltas}</b> respostas do formulário sem criadora →
            </Link>
          )}
          <Pendencia
            titulo={`Lembrete: contatadas há mais de ${DIAS_LEMBRETE} dias`}
            itens={p.lembrete.map((c) => ({ id: c.id, rotulo: nomeExibicao(c), detalhe: haQuanto(c.statusEm) }))}
          />
          <Pendencia titulo="Fecharam e falta enviar" itens={p.faltaEnviar.map((c) => ({ id: c.id, rotulo: nomeExibicao(c), detalhe: c.kit ?? undefined }))} />
          <Pendencia titulo="Post com prazo vencido" itens={p.entregasAtrasadas.map((c) => ({ id: c.id, rotulo: nomeExibicao(c) }))} />
          <Pendencia titulo="Cachê a pagar" itens={p.pagamentoPendente.map((c) => ({ id: c.id, rotulo: nomeExibicao(c), detalhe: c.valorCombinado ? formatarReais(c.valorCombinado.toNumber()) : undefined }))} />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-2xl font-semibold text-ink">Resultado das parcerias</h2>
          <span className="flex flex-wrap items-center gap-2 text-xs text-muted">
            {p.cuponsAtualizadosEm && `cupons atualizados ${haQuanto(p.cuponsAtualizadosEm)}`}
            <BotaoAcao url="/api/parcerias/cupons" rotulo="Atualizar vendas dos cupons" rotuloAndamento="Buscando no Shopify..." />
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted">Investido (produtos, frete, cachê)</p>
            <p className="font-serif text-2xl font-semibold tabular-nums text-ink">{formatarReais(p.investido)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted">Vendas com cupom de criadora</p>
            <p className="font-serif text-2xl font-semibold tabular-nums text-ink">{formatarReais(p.vendas)}</p>
            <p className="text-xs text-muted">{p.pedidos} pedidos</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted">Cada R$ 1 investido virou</p>
            <p className={`font-serif text-2xl font-semibold tabular-nums ${retorno === null ? "text-ink" : retorno >= 1 ? "text-ok" : "text-alerta"}`}>
              {retorno === null ? "—" : formatarReais(retorno)}
            </p>
            <p className="text-xs text-muted">em vendas. Venda sem cupom não aparece aqui.</p>
          </div>
        </div>
        {p.ranking.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm [&_td]:pr-4 [&_th]:pr-4">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="py-2 font-semibold">Criadora</th>
                  <th className="py-2 font-semibold">Cupom</th>
                  <th className="py-2 text-right font-semibold">Pedidos</th>
                  <th className="py-2 text-right font-semibold">Vendas</th>
                  <th className="py-2 text-right font-semibold">Investido</th>
                </tr>
              </thead>
              <tbody>
                {p.ranking.map((r) => (
                  <tr key={r.id} className="border-b border-border">
                    <td className="py-2">
                      <Link href={`/marketing/parcerias/criadoras/${r.id}`} className="text-ink hover:underline">
                        {nomeExibicao(r)}
                      </Link>
                    </td>
                    <td className="py-2 text-xs text-muted">{r.cupom}</td>
                    <td className="py-2 text-right tabular-nums">{r.pedidos}</td>
                    <td className="py-2 text-right tabular-nums">{formatarReais(r.vendas)}</td>
                    <td className="py-2 text-right tabular-nums text-muted">{formatarReais(r.investido)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
