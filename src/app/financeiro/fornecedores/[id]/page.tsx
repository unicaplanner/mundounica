import Link from "next/link";
import { notFound } from "next/navigation";
import { getFornecedor, linkWhatsapp } from "@/lib/financeiro/fornecedores";
import { formatarQuantidade, formatarReais } from "@/lib/financeiro/formato";
import { FornecedorDados, MensagensFornecedor } from "@/components/financeiro/FornecedorEditor";

export const dynamic = "force-dynamic";

const dataBR = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" });
const dataISO = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });

export default async function FornecedorPage({ params }: PageProps<"/financeiro/fornecedores/[id]">) {
  const { id } = await params;
  const f = await getFornecedor(id);
  if (!f) notFound();
  const wa = linkWhatsapp(f.whatsapp);
  const total = f.compras.reduce((acc, c) => acc + c.valorTotal.toNumber(), 0);

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Link href="/financeiro/fornecedores" className="text-xs text-muted hover:text-ink">
          ← Todos os fornecedores
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-serif text-2xl font-semibold text-ink">{f.nome}</h2>
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-ok px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Abrir WhatsApp
            </a>
          )}
          {f.link && (
            <a href={f.link} target="_blank" rel="noopener noreferrer" className="text-sm text-ink underline">
              loja / anúncio ↗
            </a>
          )}
        </div>
        <p className="text-sm text-muted">
          {f.compras.length} {f.compras.length === 1 ? "compra" : "compras"} · {formatarReais(total)} no total
          {f.compras[0] && ` · última em ${dataBR.format(f.compras[0].data)}`}
        </p>
        {f.observacoes && <p className="max-w-2xl whitespace-pre-line rounded-xl bg-accent-soft/60 px-4 py-3 text-sm text-ink">{f.observacoes}</p>}
        <FornecedorDados id={f.id} nome={f.nome} whatsapp={f.whatsapp} link={f.link} observacoes={f.observacoes} />
      </div>

      <section className="space-y-3">
        <h3 className="font-serif text-xl font-semibold text-ink">O que vocês compram e como o preço mudou</h3>
        {f.materiais.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma compra ainda.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {f.materiais.map((m) => {
              const primeiro = m.precos[0];
              const ultimo = m.precos.at(-1)!;
              const variacao = primeiro.custoUnitario > 0 ? ((ultimo.custoUnitario - primeiro.custoUnitario) / primeiro.custoUnitario) * 100 : 0;
              const maior = Math.max(...m.precos.map((p) => p.custoUnitario), 0.0001);
              return (
                <div key={m.id} className="space-y-2 rounded-2xl border border-border bg-card px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link href={`/financeiro/materiais/${m.id}`} className="font-semibold text-ink hover:underline">
                      {m.nome}
                    </Link>
                    <span className="text-xs tabular-nums text-muted">
                      hoje {formatarReais(ultimo.custoUnitario, 4)}/{m.unidade}
                      {m.precos.length > 1 && (
                        <span className={variacao > 0.5 ? "text-alerta" : variacao < -0.5 ? "text-ok" : ""}>
                          {" "}
                          ({variacao > 0 ? "+" : ""}
                          {variacao.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% desde a 1ª)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex h-12 items-end gap-1" aria-hidden="true">
                    {m.precos.map((p, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t bg-ink/60"
                        style={{ height: `${Math.max((p.custoUnitario / maior) * 100, 4)}%` }}
                        title={`${dataBR.format(p.data)}: ${formatarReais(p.custoUnitario, 4)}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted">
                    {m.precos.length} {m.precos.length === 1 ? "compra" : "compras"} ·{" "}
                    {formatarQuantidade(m.precos.reduce((a, p) => a + p.quantidade, 0))} {m.unidade} no total
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="font-serif text-xl font-semibold text-ink">Mensagens importantes</h3>
        <MensagensFornecedor
          id={f.id}
          mensagens={f.mensagens.map((m) => ({ id: m.id, data: dataISO.format(m.data), texto: m.texto }))}
        />
      </section>

      <section className="space-y-3">
        <h3 className="font-serif text-xl font-semibold text-ink">Últimas compras</h3>
        {f.compras.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma compra ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm [&_td]:pr-4 [&_th]:pr-4">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="py-2 font-semibold">Data</th>
                  <th className="py-2 font-semibold">Material</th>
                  <th className="py-2 text-right font-semibold">Quantidade</th>
                  <th className="py-2 text-right font-semibold">Total</th>
                  <th className="py-2 text-right font-semibold">Por unidade</th>
                </tr>
              </thead>
              <tbody>
                {f.compras.slice(0, 30).map((c) => (
                  <tr key={c.id} className="border-b border-border">
                    <td className="py-2 tabular-nums text-muted">{dataBR.format(c.data)}</td>
                    <td className="py-2 text-ink">{c.material.nome}</td>
                    <td className="py-2 text-right tabular-nums">
                      {formatarQuantidade(c.quantidade.toNumber())} {c.material.unidade}
                    </td>
                    <td className="py-2 text-right tabular-nums">{formatarReais(c.valorTotal.toNumber())}</td>
                    <td className="py-2 text-right tabular-nums text-muted">{formatarReais(c.custoUnitario.toNumber(), 4)}</td>
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
