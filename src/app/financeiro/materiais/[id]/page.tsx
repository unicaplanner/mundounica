import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { carregarEstoque } from "@/lib/financeiro/estoque";
import { formatarQuantidade, formatarReais } from "@/lib/financeiro/formato";
import { ContagemEstoque } from "@/components/financeiro/ContagemEstoque";

export const dynamic = "force-dynamic";

const dataBR = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" });
const pct = (n: number) => `${n > 0 ? "+" : ""}${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

export default async function MaterialPage({ params }: PageProps<"/financeiro/materiais/[id]">) {
  const { id } = await params;
  const [material, estoques] = await Promise.all([
    prisma.material.findUnique({
      where: { id },
      include: {
        compras: { orderBy: [{ data: "asc" }, { createdAt: "asc" }], include: { fornecedorRef: { select: { id: true, nome: true } } } },
        fichaTecnica: { include: { produto: { select: { id: true, title: true } } } },
        envios: { include: { tipoEnvio: { select: { nome: true } } } },
      },
    }),
    carregarEstoque(),
  ]);
  if (!material) notFound();
  const estoque = estoques.get(material.id);
  const precos = material.compras.map((c) => ({ data: c.data, valor: c.custoUnitario.toNumber() }));
  const maior = Math.max(...precos.map((p) => p.valor), 0.0001);
  const primeiro = precos[0];
  const ultimo = precos.at(-1);
  const variacao = primeiro && ultimo && primeiro.valor > 0 ? ((ultimo.valor - primeiro.valor) / primeiro.valor) * 100 : null;
  const anterior = precos.at(-2);
  const ultimaVariacao = anterior && ultimo && anterior.valor > 0 ? ((ultimo.valor - anterior.valor) / anterior.valor) * 100 : null;
  const produtos = [...new Map(material.fichaTecnica.map((f) => [f.produto.id, f.produto])).values()].sort((a, b) =>
    a.title.localeCompare(b.title, "pt-BR")
  );

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Link href="/financeiro/materiais" className="text-xs text-muted hover:text-ink">
          ← Todos os materiais
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-serif text-2xl font-semibold text-ink">{material.nome}</h2>
          {material.impresso && <span className="rounded-full bg-ok-soft px-2.5 py-0.5 text-[11px] font-semibold text-ok">impresso</span>}
          {material.linkCompra && (
            <a href={material.linkCompra} target="_blank" rel="noopener noreferrer" className="text-sm text-ink underline">
              comprar ↗
            </a>
          )}
        </div>
        <p className="text-sm text-muted">
          Custo atual: <strong className="text-ink">{formatarReais(material.custoAtual.toNumber(), 4)}</strong> por {material.unidade}
          {ultimaVariacao !== null && (
            <span className={ultimaVariacao > 0.5 ? "text-alerta" : ultimaVariacao < -0.5 ? "text-ok" : ""}>
              {" "}
              ({pct(ultimaVariacao)} na última compra)
            </span>
          )}
        </p>
      </div>

      <section className="space-y-3 rounded-2xl border border-border bg-card px-5 py-5">
        <h3 className="font-serif text-lg font-semibold text-ink">Estoque</h3>
        {estoque?.atual === null || !estoque ? (
          <p className="text-sm text-muted">
            Faça uma contagem pra começar: a partir dela, cada venda dá baixa no estoque sozinha e cada compra soma.
            {estoque && estoque.consumoMensal > 0 && (
              <> Pelas vendas, sai em média {formatarQuantidade(Math.round(estoque.consumoMensal))} {material.unidade} por mês.</>
            )}
          </p>
        ) : (
          <div className="space-y-1 text-sm">
            <p>
              <span className={`font-serif text-2xl font-semibold ${estoque.atual < 0 ? "text-alerta" : "text-ink"}`}>
                {formatarQuantidade(Math.round(estoque.atual))} {material.unidade}
              </span>{" "}
              <span className="text-muted">em estoque (estimado)</span>
            </p>
            <p className="text-xs text-muted">
              Contagem de {formatarQuantidade(estoque.contado!)} em {dataBR.format(estoque.contadoEm!)} + compras depois (
              {formatarQuantidade(Math.round(estoque.comprasDepois))}) − saída pelas vendas ({formatarQuantidade(Math.round(estoque.consumoDepois))}).
            </p>
            {estoque.consumoMensal > 0 && (
              <p className={`text-xs ${estoque.mesesRestantes !== null && estoque.mesesRestantes < 1 ? "font-semibold text-alerta" : "text-muted"}`}>
                Sai em média {formatarQuantidade(Math.round(estoque.consumoMensal))} {material.unidade} por mês
                {estoque.mesesRestantes !== null &&
                  ` — dá pra uns ${estoque.mesesRestantes.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${estoque.mesesRestantes < 1.05 ? "mês" : "meses"}`}
                {estoque.mesesRestantes !== null && estoque.mesesRestantes < 1 && ". Hora de comprar."}
              </p>
            )}
          </div>
        )}
        <ContagemEstoque materialId={material.id} unidade={material.unidade} />
        <p className="text-xs text-muted">
          A saída conta os produtos vendidos que usam este material na ficha e a embalagem dos pedidos. Perdas e
          reimpressões não entram: conte de tempos em tempos pra acertar.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="font-serif text-lg font-semibold text-ink">Histórico de preço</h3>
        {precos.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma compra registrada.</p>
        ) : (
          <>
            <div className="flex h-24 items-end gap-1" aria-hidden="true">
              {precos.map((p, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-ink/60"
                  style={{ height: `${Math.max((p.valor / maior) * 100, 4)}%` }}
                  title={`${dataBR.format(p.data)}: ${formatarReais(p.valor, 4)}`}
                />
              ))}
            </div>
            {variacao !== null && precos.length > 1 && (
              <p className="text-xs text-muted">
                De {formatarReais(primeiro!.valor, 4)} ({dataBR.format(primeiro!.data)}) pra {formatarReais(ultimo!.valor, 4)} (
                {dataBR.format(ultimo!.data)}): {pct(variacao)}.
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm [&_td]:pr-4 [&_th]:pr-4">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted">
                    <th className="py-2 font-semibold">Data</th>
                    <th className="py-2 font-semibold">Fornecedor</th>
                    <th className="py-2 text-right font-semibold">Quantidade</th>
                    <th className="py-2 text-right font-semibold">Total</th>
                    <th className="py-2 text-right font-semibold">Por {material.unidade}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...material.compras].reverse().map((c) => (
                    <tr key={c.id} className="border-b border-border">
                      <td className="py-2 tabular-nums text-muted">{dataBR.format(c.data)}</td>
                      <td className="py-2">
                        {c.fornecedorRef ? (
                          <Link href={`/financeiro/fornecedores/${c.fornecedorRef.id}`} className="text-ink underline">
                            {c.fornecedorRef.nome}
                          </Link>
                        ) : (
                          <span className="text-muted">{c.fornecedor ?? "—"}</span>
                        )}
                      </td>
                      <td className="py-2 text-right tabular-nums">{formatarQuantidade(c.quantidade.toNumber())}</td>
                      <td className="py-2 text-right tabular-nums">{formatarReais(c.valorTotal.toNumber())}</td>
                      <td className="py-2 text-right tabular-nums text-muted">{formatarReais(c.custoUnitario.toNumber(), 4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="font-serif text-lg font-semibold text-ink">Onde é usado</h3>
        {produtos.length === 0 && material.envios.length === 0 ? (
          <p className="text-sm text-muted">Ainda não está em nenhuma ficha nem embalagem de envio.</p>
        ) : (
          <ul className="flex flex-wrap gap-2 text-sm">
            {material.envios.map((e) => (
              <li key={e.id}>
                <Link href="/financeiro/envio" className="rounded-full bg-accent-soft px-3 py-1 text-xs text-ink hover:bg-border">
                  Envio: {e.tipoEnvio.nome}
                </Link>
              </li>
            ))}
            {produtos.map((p) => (
              <li key={p.id}>
                <Link href={`/financeiro/produtos/${p.id}`} className="rounded-full bg-accent-soft px-3 py-1 text-xs text-ink hover:bg-border">
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
