import Link from "next/link";
import { notFound } from "next/navigation";
import { getImpressoras, getMateriais, getProduto } from "@/lib/financeiro/queries";
import { carregarCustos, nomeVariante, type Custo } from "@/lib/financeiro/custo";
import { impressoraPadrao } from "@/lib/financeiro/impressao";
import { carregarParametros } from "@/lib/financeiro/precificacao";
import { carregarVendas } from "@/lib/financeiro/vendas";
import { ROTULO_TIPO, analisarPreco, metaDoTipo, type ParametrosAnalise, type TipoComMeta } from "@/lib/financeiro/analise";
import { formatarReais } from "@/lib/financeiro/formato";
import { ClassificarProduto } from "@/components/financeiro/ClassificarProduto";
import { AplicarModelo, type CandidatoModelo } from "@/components/financeiro/AplicarModelo";
import { ComposicaoEditor } from "@/components/financeiro/ComposicaoEditor";
import { CopiarComposicao } from "@/components/financeiro/CopiarComposicao";
import { CustoPorVariante } from "@/components/financeiro/CustoPorVariante";
import { SimuladorPreco } from "@/components/financeiro/SimuladorPreco";
import { StatusPreco } from "@/components/financeiro/StatusPreco";
import { StatusShopify } from "@/components/financeiro/StatusShopify";
import type { CandidatoKit } from "@/components/financeiro/KitEditor";

export const dynamic = "force-dynamic";

const num = (d: { toNumber(): number } | null | undefined) => (d ? d.toNumber() : null);

// Margem de contribuicao % com a etiqueta de situacao (comparada com a meta do tipo).
function Margem({ preco, custo, ctx }: { preco: number | null; custo: number | null; ctx: ContextoAnalise }) {
  const a = preco !== null && custo !== null ? analisarPreco(custo, preco, ctx.p, ctx.meta) : null;
  if (!a) return <span className="text-muted">—</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`tabular-nums ${a.contribuicao < 0 ? "font-semibold text-alerta" : ""}`}>
        {a.contribuicaoPct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
      </span>
      <StatusPreco status={a.status} />
    </span>
  );
}

type ContextoAnalise = {
  p: ParametrosAnalise;
  meta: number;
  rotuloTipo: string;
  rotuloCusto: string;
  envioPorPedido: number | null;
  itensPorPedido: number | null;
};

function AnalisePreco({ custo, preco, ctx }: { custo: number; preco: number | null; ctx: ContextoAnalise }) {
  return (
    <section className="rounded-2xl border border-border bg-card px-5 py-4">
      <h3 className="mb-3 text-sm font-semibold text-ink">Pra onde vai cada venda</h3>
      <SimuladorPreco
        custo={custo}
        precoSite={preco}
        parametros={ctx.p}
        meta={ctx.meta}
        rotuloTipo={ctx.rotuloTipo}
        rotuloCusto={ctx.rotuloCusto}
        envioPorPedido={ctx.envioPorPedido}
        itensPorPedido={ctx.itensPorPedido}
      />
    </section>
  );
}

export default async function ProdutoPage({ params }: PageProps<"/financeiro/produtos/[id]">) {
  const { id } = await params;
  const [produto, materiais, custos, impressorasDb, parametros, vendas] = await Promise.all([
    getProduto(id),
    getMateriais(),
    carregarCustos(),
    getImpressoras(),
    carregarParametros(),
    carregarVendas(),
  ]);
  if (!produto) notFound();

  const p: ParametrosAnalise = {
    fixosPct: parametros.fixosPct,
    despesasPct: parametros.despesasPct,
    lucroPct: parametros.lucroPct,
    envioPorProduto: parametros.envioPorProduto,
    despesas: parametros.despesas,
    margens: parametros.margens,
    totalFixos: parametros.totalFixos,
  };
  const tipoMeta: TipoComMeta = produto.tipo === "revenda" || produto.tipo === "kit" ? produto.tipo : "producao_propria";
  const ctx: ContextoAnalise = {
    p,
    meta: metaDoTipo(p, produto.tipo),
    rotuloTipo: ROTULO_TIPO[tipoMeta],
    rotuloCusto:
      produto.tipo === "revenda"
        ? "Custo de compra"
        : produto.tipo === "kit"
          ? "Produtos do kit e embalagem"
          : "Produção (materiais, impressão e mão de obra)",
    envioPorPedido: parametros.custoMedioEnvio,
    itensPorPedido: parametros.itensPorPedido,
  };

  const temVariantes = produto.variantes.length > 1;
  const ignorado = produto.tipo === "ignorar";
  const porVariante = produto.tipo !== null && !ignorado && produto.custoPorVariante;

  const listaMateriais = materiais.map((m) => ({
    id: m.id,
    nome: m.nome,
    unidade: m.unidade,
    custoAtual: m.custoAtual.toNumber(),
    impresso: m.impresso,
  }));

  // toda folha impressa usa o custo da impressora mais cara
  const padrao = impressoraPadrao(impressorasDb);

  const fichaDe = (varianteId: string | null) =>
    produto.fichaTecnica
      .filter((f) => f.varianteId === varianteId)
      .map((f) => ({
        id: f.id,
        quantidade: f.quantidade.toNumber(),
        material: {
          id: f.material.id,
          nome: f.material.nome,
          unidade: f.material.unidade,
          custoAtual: f.material.custoAtual.toNumber(),
          impresso: f.material.impresso,
        },
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
          .filter((p) => p.tipo !== "kit" && p.tipo !== "ignorar" && p.id !== produto.id)
          .flatMap((p) =>
            p.variantes
              .filter((v) => v.ativa)
              .map((v) => ({ id: v.id, rotulo: nomeVariante(p.title, v.title), custo: num(custos.daVariante(v.id)?.valor) }))
          )
          .sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR"))
      : [];

  const composicaoProps = (varianteId: string | null, custoCompra: number | null, minutos: number | null) => ({
    produtoId: produto.id,
    varianteId,
    tipo: produto.tipo!,
    custoCompra,
    ficha: fichaDe(varianteId),
    kit: kitDe(varianteId),
    materiais: listaMateriais,
    candidatos,
    custoFolha: num(padrao?.custoFolha),
    impressora: padrao?.nome ?? null,
    minutos,
    valorHora: parametros.valorHora,
  });

  // Outros produtos que podem receber esta composicao como modelo.
  const temComposicao = (c: { custoCompra: unknown; ficha: unknown[]; kit: unknown[] }) =>
    c.custoCompra !== null || c.ficha.length > 0 || c.kit.length > 0;
  const candidatosModelo: CandidatoModelo[] = [...custos.produtos.values()]
    .filter((c) => c.id !== produto.id)
    .map((c) => {
      const ativas = c.variantes.filter((v) => v.ativa);
      return {
        id: c.id,
        title: c.title,
        tipo: c.tipo,
        variantes: ativas.map((v) => v.title),
        temComposicao: temComposicao(c.composicao) || ativas.some((v) => temComposicao(v.composicao)),
        receita: vendas.porProduto.get(c.id) ?? 0,
      };
    });

  const custoUnico: Custo | null = produto.tipo && !ignorado && !porVariante ? custos.doProduto(produto.id) : null;
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

      {ignorado && (
        <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted">
          Esse produto <strong>não entra nas contas</strong> de custo e lucro (brinde, por exemplo) e saiu da lista de
          pendentes. Se ele tiver custo de verdade, classifique como produção própria, revenda ou kit.
        </p>
      )}

      {produto.tipo && !ignorado && (temVariantes || produto.custoPorVariante) && (
        <CustoPorVariante
          produtoId={produto.id}
          custoPorVariante={produto.custoPorVariante}
          totalVariantes={produto.variantes.length}
        />
      )}

      {produto.tipo && !ignorado && !porVariante && (
        <>
          <div className="rounded-2xl bg-ink px-6 py-5 text-background">
            <p className="text-xs uppercase tracking-wide text-background/60">Custo de uma unidade</p>
            <p className="font-serif text-3xl font-semibold">{custoUnicoNum !== null ? formatarReais(custoUnicoNum) : "—"}</p>
            {custoUnico?.incompleto && (
              <p className="mt-1 text-xs text-accent">
                Incompleto: falta compra de algum material, custo de algum produto ou páginas/ano da impressora.
              </p>
            )}
            {custoUnicoNum === null && <p className="mt-1 text-xs text-background/70">Preencha a composição abaixo.</p>}
            {precoUnico !== null && (
              <p className="mt-2 text-xs text-background/80">Preço no site {formatarReais(precoUnico)}</p>
            )}
          </div>

          {custoUnicoNum !== null && custoUnicoNum > 0 && !temVariantes && (
            <AnalisePreco custo={custoUnicoNum} preco={precoUnico} ctx={ctx} />
          )}

          {temVariantes && (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-ink">Preço no site e margem de contribuição por variante</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm [&_td]:pr-4 [&_th]:pr-4">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted">
                      <th className="py-2 font-semibold">Variante</th>
                      <th className="py-2 font-semibold">Preço no site</th>
                      <th className="py-2 font-semibold">Margem de contribuição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {produto.variantes.map((v) => (
                      <tr key={v.id} className="border-b border-border">
                        <td className="py-2">{v.title}</td>
                        <td className="py-2 tabular-nums">{v.preco ? formatarReais(v.preco.toNumber()) : "—"}</td>
                        <td className="py-2">
                          <Margem preco={num(v.preco)} custo={custoUnicoNum} ctx={ctx} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-muted">
                Margem de contribuição: o que sobra depois do custo, da embalagem de envio, das taxas e do imposto — é o que paga os custos fixos. Meta de {ROTULO_TIPO[tipoMeta]}: {ctx.meta}%.
              </p>
            </section>
          )}

          {custoUnicoNum !== null && custoUnicoNum > 0 && temVariantes && (
            <AnalisePreco custo={custoUnicoNum} preco={null} ctx={ctx} />
          )}

          <section>
            <h3 className="mb-3 text-sm font-semibold text-ink">
              {produto.tipo === "revenda" ? "Custo de compra" : produto.tipo === "kit" ? "Composição do kit" : "Para produzir"}
            </h3>
            <ComposicaoEditor {...composicaoProps(null, num(produto.custoCompra), num(produto.minutosProducao))} />
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
            <p className="text-xs text-muted">Clique numa variante pra ver e editar a composição e simular o preço dela.</p>
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
                      <span className="w-44">
                        <Margem preco={preco} custo={custoNum} ctx={ctx} />
                      </span>
                    </summary>
                    <div className="space-y-6 pb-6 pl-5">
                      <ComposicaoEditor {...composicaoProps(v.id, num(v.custoCompra), num(v.minutosProducao))} />
                      {custoNum !== null && custoNum > 0 && (
                        <AnalisePreco custo={custoNum} preco={preco} ctx={ctx} />
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
            <p className="text-xs text-muted">
              Colunas: preço no site, custo e margem de contribuição (meta de {ROTULO_TIPO[tipoMeta]}: {ctx.meta}%).
            </p>
          </section>
        </>
      )}

      {produto.tipo && !ignorado && (custoUnico !== null || (resumo?.modo === "variante" && resumo.comCusto > 0)) && (
        <AplicarModelo
          produtoId={produto.id}
          porVariante={porVariante}
          variantesOrigem={produto.variantes.map((v) => v.title)}
          candidatos={candidatosModelo}
        />
      )}
    </div>
  );
}
