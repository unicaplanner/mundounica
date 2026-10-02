import Link from "next/link";
import { notFound } from "next/navigation";
import { getMateriais, getProduto } from "@/lib/financeiro/queries";
import { carregarCustos, nomeVariante, type Custo } from "@/lib/financeiro/custo";
import { formatarMargem, formatarReais, margem } from "@/lib/financeiro/formato";
import { ClassificarProduto } from "@/components/financeiro/ClassificarProduto";
import { ComposicaoEditor } from "@/components/financeiro/ComposicaoEditor";
import { CopiarComposicao } from "@/components/financeiro/CopiarComposicao";
import { CustoPorVariante } from "@/components/financeiro/CustoPorVariante";
import { StatusShopify } from "@/components/financeiro/StatusShopify";
import { SugestaoPreco } from "@/components/financeiro/SugestaoPreco";
import type { CandidatoKit } from "@/components/financeiro/KitEditor";

export const dynamic = "force-dynamic";

const num = (d: { toNumber(): number } | null | undefined) => (d ? d.toNumber() : null);

function Margem({ preco, custo }: { preco: number | null; custo: number | null }) {
  const m = margem(preco, custo);
  return <span className={m !== null && m < 0 ? "font-semibold text-alerta" : ""}>{formatarMargem(m)}</span>;
}

export default async function ProdutoPage({ params }: PageProps<"/financeiro/produtos/[id]">) {
  const { id } = await params;
  const [produto, materiais, custos] = await Promise.all([getProduto(id), getMateriais(), carregarCustos()]);
  if (!produto) notFound();

  const temVariantes = produto.variantes.length > 1;
  const porVariante = produto.tipo !== null && produto.custoPorVariante;

  const listaMateriais = materiais.map((m) => ({
    id: m.id,
    nome: m.nome,
    unidade: m.unidade,
    custoAtual: m.custoAtual.toNumber(),
  }));

  const fichaDe = (varianteId: string | null) =>
    produto.fichaTecnica
      .filter((f) => f.varianteId === varianteId)
      .map((f) => ({
        id: f.id,
        quantidade: f.quantidade.toNumber(),
        material: { id: f.material.id, nome: f.material.nome, unidade: f.material.unidade, custoAtual: f.material.custoAtual.toNumber() },
      }));

  const kitDe = (varianteId: string | null) =>
    produto.componentes
      .filter((k) => k.kitVarianteId === varianteId)
      .map((k) => {
        const custo = custos.daVariante(k.componenteVarianteId);
        return {
          id: k.id,
          quantidade: k.quantidade.toNumber(),
          componenteVarianteId: k.componenteVarianteId,
          componenteProdutoId: k.componente.produtoId,
          rotulo:
            nomeVariante(k.componente.produto.title, k.componente.title) +
            (k.componente.ativa ? "" : " (removida do Shopify)"),
          custo: num(custo?.valor),
          incompleto: custo?.incompleto ?? false,
        };
      });

  const candidatos: CandidatoKit[] =
    produto.tipo === "kit"
      ? [...custos.produtos.values()]
          .filter((p) => p.tipo !== "kit" && p.id !== produto.id)
          .flatMap((p) =>
            p.variantes
              .filter((v) => v.ativa)
              .map((v) => ({ id: v.id, rotulo: nomeVariante(p.title, v.title), custo: num(custos.daVariante(v.id)?.valor) }))
          )
          .sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR"))
      : [];

  const composicaoProps = (varianteId: string | null, custoCompra: number | null) => ({
    produtoId: produto.id,
    varianteId,
    tipo: produto.tipo!,
    custoCompra,
    ficha: fichaDe(varianteId),
    kit: kitDe(varianteId),
    materiais: listaMateriais,
    candidatos,
  });

  const custoUnico: Custo | null = produto.tipo && !porVariante ? custos.doProduto(produto.id) : null;
  const custoUnicoNum = num(custoUnico?.valor);
  const resumo = custos.resumo(produto.id);
  const precoUnico = !temVariantes ? num(produto.variantes[0]?.preco) : null;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/financeiro" className="text-xs text-muted hover:text-ink">
          ← Voltar pra lista de produtos
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h2 className="font-serif text-2xl font-semibold text-ink">{produto.title}</h2>
          <StatusShopify status={produto.status} />
        </div>
        {produto.url && (
          <a href={produto.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted underline">
            Ver no site
          </a>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted">Esse produto é</span>
        <ClassificarProduto produtoId={produto.id} tipo={produto.tipo ?? ""} />
      </div>

      {produto.tipo === null && (
        <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted">
          Escolha acima: <strong>produção própria</strong> (feito aqui, com ficha técnica de materiais),{" "}
          <strong>revenda</strong> (você compra pronto) ou <strong>kit</strong> (junta outros produtos da loja).
        </p>
      )}

      {produto.tipo && (temVariantes || produto.custoPorVariante) && (
        <CustoPorVariante
          produtoId={produto.id}
          custoPorVariante={produto.custoPorVariante}
          totalVariantes={produto.variantes.length}
        />
      )}

      {produto.tipo && !porVariante && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-ink px-6 py-5 text-background">
            <div>
              <p className="text-xs uppercase tracking-wide text-background/60">Custo de uma unidade</p>
              <p className="font-serif text-3xl font-semibold">{custoUnicoNum !== null ? formatarReais(custoUnicoNum) : "—"}</p>
              {custoUnico?.incompleto && (
                <p className="mt-1 text-xs text-accent">Incompleto: falta compra de algum material ou custo de algum produto.</p>
              )}
              {custoUnicoNum === null && (
                <p className="mt-1 text-xs text-background/70">Preencha a composição abaixo.</p>
              )}
              {precoUnico !== null && (
                <p className="mt-2 text-xs text-background/80">
                  Preço no site {formatarReais(precoUnico)} · margem <Margem preco={precoUnico} custo={custoUnicoNum} />
                </p>
              )}
            </div>
            {custoUnicoNum !== null && custoUnicoNum > 0 && (
              <div className="rounded-xl bg-background px-3 py-2">
                <p className="mb-1 text-[11px] text-muted">Preço sugerido</p>
                <SugestaoPreco custo={custoUnicoNum} />
              </div>
            )}
          </div>

          {temVariantes && (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-ink">Preço no site e margem por variante</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm [&_td]:pr-4 [&_th]:pr-4">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted">
                      <th className="py-2 font-semibold">Variante</th>
                      <th className="py-2 font-semibold">Preço no site</th>
                      <th className="py-2 font-semibold">Margem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {produto.variantes.map((v) => (
                      <tr key={v.id} className="border-b border-border">
                        <td className="py-2">{v.title}</td>
                        <td className="py-2 tabular-nums">{v.preco ? formatarReais(v.preco.toNumber()) : "—"}</td>
                        <td className="py-2 tabular-nums">
                          <Margem preco={num(v.preco)} custo={custoUnicoNum} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-muted">Margem bruta: preço menos o custo acima, sem taxa de cartão, frete ou imposto.</p>
            </section>
          )}

          <section>
            <h3 className="mb-3 text-sm font-semibold text-ink">
              {produto.tipo === "revenda" ? "Custo de compra" : produto.tipo === "kit" ? "Composição do kit" : "Ficha técnica"}
            </h3>
            <ComposicaoEditor {...composicaoProps(null, num(produto.custoCompra))} />
          </section>
        </>
      )}

      {porVariante && resumo?.modo === "variante" && (
        <>
          <div className="rounded-2xl bg-ink px-6 py-5 text-background">
            <p className="text-xs uppercase tracking-wide text-background/60">Custo por variante</p>
            <p className="font-serif text-3xl font-semibold">
              {resumo.min === null
                ? "—"
                : resumo.min.equals(resumo.max!)
                  ? formatarReais(resumo.min.toNumber())
                  : `${formatarReais(resumo.min.toNumber())} a ${formatarReais(resumo.max!.toNumber())}`}
            </p>
            <p className="mt-1 text-xs text-background/70">
              {resumo.comCusto} de {resumo.total} variantes com custo
              {resumo.incompleto && resumo.comCusto > 0 ? " · algumas incompletas" : ""}.
            </p>
          </div>

          <CopiarComposicao produtoId={produto.id} variantes={produto.variantes.map((v) => ({ id: v.id, title: v.title }))} />

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-ink">Variantes</h3>
            <p className="text-xs text-muted">Clique numa variante pra ver e editar a composição dela.</p>
            <div className="divide-y divide-border border-y border-border">
              {produto.variantes.map((v) => {
                const custo = custos.daVariante(v.id);
                const custoNum = num(custo?.valor);
                const preco = num(v.preco);
                return (
                  <details key={v.id} className="group">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm marker:hidden">
                      <span className="text-muted transition group-open:rotate-90" aria-hidden="true">
                        ›
                      </span>
                      <span className="min-w-0 flex-1 basis-40 font-semibold text-ink">{v.title}</span>
                      <span className="w-28 tabular-nums text-muted">{preco !== null ? formatarReais(preco) : "—"}</span>
                      <span className="w-28 tabular-nums">
                        {custoNum !== null ? (
                          <>
                            {formatarReais(custoNum)}
                            {custo?.incompleto && <span className="ml-1 text-xs text-alerta">incompleto</span>}
                          </>
                        ) : (
                          <span className="text-xs text-alerta">sem custo</span>
                        )}
                      </span>
                      <span className="w-20 text-right tabular-nums text-muted">
                        <Margem preco={preco} custo={custoNum} />
                      </span>
                    </summary>
                    <div className="pb-6 pl-5">
                      <ComposicaoEditor {...composicaoProps(v.id, num(v.custoCompra))} />
                    </div>
                  </details>
                );
              })}
            </div>
            <p className="text-xs text-muted">Colunas: preço no site, custo e margem bruta (sem taxa de cartão, frete ou imposto).</p>
          </section>
        </>
      )}
    </div>
  );
}
