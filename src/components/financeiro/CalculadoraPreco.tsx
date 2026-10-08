"use client";

import { useId, useMemo, useState } from "react";
import {
  ROTULO_TIPO,
  analisarPreco,
  metaDoTipo,
  precoSugerido,
  type ParametrosAnalise,
  type TipoComMeta,
} from "@/lib/financeiro/analise";
import { formatarReais, normalizarNumero } from "@/lib/financeiro/formato";
import { StatusPreco } from "./StatusPreco";
import { botaoSecundario, campo, rotulo } from "./estilos";

export type MaterialCalc = { id: string; nome: string; unidade: string; custoAtual: number; impresso: boolean };
type Linha = { chave: number; materialId: string; quantidade: string };
type Avulso = { chave: number; nome: string; valor: string };

const n = (t: string) => {
  const v = Number(normalizarNumero(t));
  return Number.isFinite(v) && v > 0 ? v : 0;
};
const pct = (v: number, casas = 1) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: casas })}%`;
// arredonda pra cima num preco "redondo" de loja: x,90
const precoDeLoja = (v: number) => Math.ceil(v + 0.1) - 0.1;

// Calculadora de orcamento: monta o custo de um produto novo ou de uma
// encomenda personalizada sem cadastrar nada, usando os custos do sistema
// (materiais com impressao, hora de producao, embalagem, taxas, metas), e uma
// conselheira que lembra as regras de saude financeira.
export function CalculadoraPreco({
  materiais,
  parametros,
  custoFolha,
  valorHora,
  envioPorPedido,
  meiPct,
}: {
  materiais: MaterialCalc[];
  parametros: ParametrosAnalise;
  custoFolha: number | null;
  valorHora: number | null;
  envioPorPedido: number | null;
  meiPct: number;
}) {
  const id = useId();
  const [tipo, setTipo] = useState<TipoComMeta>("producao_propria");
  const [linhas, setLinhas] = useState<Linha[]>([{ chave: 1, materialId: materiais[0]?.id ?? "", quantidade: "" }]);
  const [avulsos, setAvulsos] = useState<Avulso[]>([]);
  const [custoCompra, setCustoCompra] = useState("");
  const [minutos, setMinutos] = useState("");
  const [minutosCriacao, setMinutosCriacao] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [pedidoSozinho, setPedidoSozinho] = useState(false);
  const [preco, setPreco] = useState("");
  const [contador, setContador] = useState(2);

  const porId = useMemo(() => new Map(materiais.map((m) => [m.id, m])), [materiais]);
  const unidades = Math.max(1, Math.round(n(quantidade)) || 1);
  const meta = metaDoTipo(parametros, tipo);
  const hora = valorHora ?? 0;

  // custo de UMA unidade
  const materiaisUnid = linhas.reduce((acc, l) => {
    const m = porId.get(l.materialId);
    if (!m) return acc;
    return acc + n(l.quantidade) * (m.custoAtual + (m.impresso ? (custoFolha ?? 0) : 0));
  }, 0);
  const avulsosUnid = avulsos.reduce((acc, a) => acc + n(a.valor), 0);
  const compraUnid = n(custoCompra);
  const maoDeObraUnid = (n(minutos) / 60) * hora;
  const criacaoUnid = (n(minutosCriacao) / 60) * hora / unidades;
  const custo = materiaisUnid + avulsosUnid + compraUnid + maoDeObraUnid + criacaoUnid;

  // embalagem: rateio normal por produto, ou o pedido inteiro dividido pelas unidades
  const envioUnid = pedidoSozinho && envioPorPedido !== null ? envioPorPedido / unidades : parametros.envioPorProduto;
  const p: ParametrosAnalise = { ...parametros, envioPorProduto: envioUnid };
  const sugerido = custo > 0 ? precoSugerido(custo, p, meta) : null;
  const valorPreco = n(preco) || (sugerido ? precoDeLoja(sugerido) : 0);
  const analise = custo > 0 && valorPreco > 0 ? analisarPreco(custo, valorPreco, p, meta) : null;

  const temImpresso = linhas.some((l) => porId.get(l.materialId)?.impresso && n(l.quantidade) > 0);
  const semCompra = linhas.filter((l) => n(l.quantidade) > 0 && porId.get(l.materialId)?.custoAtual === 0).map((l) => porId.get(l.materialId)!.nome);

  // Conselheira: o que olhar neste orcamento
  const avisos: { tom: "ok" | "atencao" | "alerta"; texto: string }[] = [];
  if (analise) {
    if (analise.status === "prejuizo") avisos.push({ tom: "alerta", texto: "Esse preço não paga nem o próprio produto, a embalagem e as taxas. Não feche assim." });
    else if (analise.status === "abaixo_meta")
      avisos.push({ tom: "atencao", texto: `A margem (${pct(analise.contribuicaoPct)}) está abaixo da meta de ${ROTULO_TIPO[tipo]} (${pct(meta)}). Só aceite se for estratégico (cliente recorrente, divulgação) e por pouco tempo.` });
    else avisos.push({ tom: "ok", texto: `Margem de ${pct(analise.contribuicaoPct)}: dentro da meta de ${ROTULO_TIPO[tipo]} (${pct(meta)}).` });
    if (analise.vendasParaFixos !== null)
      avisos.push({ tom: "ok", texto: `Cada unidade deixa ${formatarReais(analise.contribuicao)} pros custos fixos: ${analise.vendasParaFixos} iguais pagam o mês (${formatarReais(parametros.totalFixos)}).` });
  }
  if (tipo !== "revenda" && n(minutos) === 0) avisos.push({ tom: "alerta", texto: "Faltou o seu tempo de produção. Trabalho manual também é custo — sem ele o preço sai baixo." });
  if (tipo === "producao_propria" && n(minutosCriacao) === 0)
    avisos.push({ tom: "atencao", texto: "É personalizado? Inclua o tempo de criar e ajustar o design. Ele é dividido pelas unidades da encomenda." });
  if (valorHora === null) avisos.push({ tom: "alerta", texto: "O valor da hora de produção não está definido (aba Custos fixos): o tempo não entra no custo." });
  if (temImpresso && custoFolha === null) avisos.push({ tom: "alerta", texto: "Falta páginas por ano na aba Impressoras: a impressão não entra no custo." });
  if (semCompra.length) avisos.push({ tom: "atencao", texto: `Sem compra registrada: ${semCompra.join(", ")}. O custo desses itens está zerado.` });
  if (pedidoSozinho && unidades === 1) avisos.push({ tom: "atencao", texto: "Pedido de uma unidade só: a embalagem inteira cai nela. Considere um pedido mínimo ou frete à parte." });
  if (sugerido && valorPreco < sugerido - 0.01 && tipo === "producao_propria")
    avisos.push({ tom: "atencao", texto: `Abaixo do sugerido (${formatarReais(sugerido)}). Produto exclusivo, feito à mão, não compete por preço: compete por valor.` });
  if (meiPct >= 80) avisos.push({ tom: "alerta", texto: `MEI em ${pct(meiPct)} do teto: inclua o Simples nas despesas por venda (aba Custos fixos).` });
  else if (meiPct >= 70) avisos.push({ tom: "atencao", texto: `MEI em ${pct(meiPct)} do teto: fique de olho no medidor.` });

  const cor = { ok: "bg-ok-soft text-ok", atencao: "bg-atencao-soft text-atencao", alerta: "bg-alerta-soft text-alerta" };
  const linhaCusto = (rotuloTxt: string, valor: number, detalhe?: string) =>
    valor > 0 && (
      <tr className="border-t border-border">
        <td className="py-1.5 pr-3">
          {rotuloTxt}
          {detalhe && <span className="ml-1 text-xs text-muted">{detalhe}</span>}
        </td>
        <td className="py-1.5 text-right tabular-nums">{formatarReais(valor)}</td>
      </tr>
    );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-6">
        <section className="space-y-4 rounded-2xl border border-border bg-card px-5 py-5">
          <h2 className="font-serif text-lg font-semibold text-ink">O que vai no produto</h2>
          <div className="flex flex-wrap gap-4">
            <div>
              <label htmlFor={`${id}-tipo`} className={rotulo}>
                Tipo
              </label>
              <select id={`${id}-tipo`} value={tipo} onChange={(e) => setTipo(e.target.value as TipoComMeta)} className={campo}>
                <option value="producao_propria">Produção própria (meta {pct(parametros.margens.producao_propria)})</option>
                <option value="kit">Kit (meta {pct(parametros.margens.kit)})</option>
                <option value="revenda">Revenda (meta {pct(parametros.margens.revenda)})</option>
              </select>
            </div>
            <div>
              <label htmlFor={`${id}-qtd`} className={rotulo}>
                Unidades da encomenda
              </label>
              <input id={`${id}-qtd`} inputMode="numeric" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className={`${campo} w-20`} />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted">Materiais por unidade (papel impresso já soma a impressão)</p>
            {linhas.map((l, i) => {
              const m = porId.get(l.materialId);
              return (
                <div key={l.chave} className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label={`Material ${i + 1}`}
                    value={l.materialId}
                    onChange={(e) => setLinhas(linhas.map((x) => (x.chave === l.chave ? { ...x, materialId: e.target.value } : x)))}
                    className={`${campo} min-w-0 flex-1 basis-56`}
                  >
                    {materiais.map((mm) => (
                      <option key={mm.id} value={mm.id}>
                        {mm.nome} ({formatarReais(mm.custoAtual + (mm.impresso ? (custoFolha ?? 0) : 0), 4)}/{mm.unidade}
                        {mm.impresso ? " com impressão" : ""})
                      </option>
                    ))}
                  </select>
                  <input
                    aria-label={`Quantidade do material ${i + 1}`}
                    inputMode="decimal"
                    placeholder={m?.unidade ?? "qtd"}
                    value={l.quantidade}
                    onChange={(e) => setLinhas(linhas.map((x) => (x.chave === l.chave ? { ...x, quantidade: e.target.value } : x)))}
                    className={`${campo} w-24`}
                  />
                  <button type="button" onClick={() => setLinhas(linhas.filter((x) => x.chave !== l.chave))} className="text-xs text-muted underline">
                    tirar
                  </button>
                </div>
              );
            })}
            {avulsos.map((a, i) => (
              <div key={a.chave} className="flex flex-wrap items-center gap-2">
                <input
                  aria-label={`Item avulso ${i + 1}`}
                  placeholder="Item avulso (ex: fita personalizada)"
                  value={a.nome}
                  onChange={(e) => setAvulsos(avulsos.map((x) => (x.chave === a.chave ? { ...x, nome: e.target.value } : x)))}
                  className={`${campo} min-w-0 flex-1 basis-56`}
                />
                <input
                  aria-label={`Valor do item avulso ${i + 1}`}
                  inputMode="decimal"
                  placeholder="R$ por unidade"
                  value={a.valor}
                  onChange={(e) => setAvulsos(avulsos.map((x) => (x.chave === a.chave ? { ...x, valor: e.target.value } : x)))}
                  className={`${campo} w-32`}
                />
                <button type="button" onClick={() => setAvulsos(avulsos.filter((x) => x.chave !== a.chave))} className="text-xs text-muted underline">
                  tirar
                </button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setLinhas([...linhas, { chave: contador, materialId: materiais[0]?.id ?? "", quantidade: "" }]);
                  setContador(contador + 1);
                }}
                className={botaoSecundario}
              >
                + Material
              </button>
              <button
                type="button"
                onClick={() => {
                  setAvulsos([...avulsos, { chave: contador, nome: "", valor: "" }]);
                  setContador(contador + 1);
                }}
                className={botaoSecundario}
              >
                + Item avulso
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            {tipo !== "producao_propria" && (
              <div>
                <label htmlFor={`${id}-compra`} className={rotulo}>
                  Custo de compra por unidade (R$)
                </label>
                <input id={`${id}-compra`} inputMode="decimal" value={custoCompra} onChange={(e) => setCustoCompra(e.target.value)} className={`${campo} w-28`} />
              </div>
            )}
            <div>
              <label htmlFor={`${id}-min`} className={rotulo}>
                Tempo de produção por unidade (min)
              </label>
              <input id={`${id}-min`} inputMode="decimal" value={minutos} onChange={(e) => setMinutos(e.target.value)} className={`${campo} w-24`} />
            </div>
            <div>
              <label htmlFor={`${id}-criacao`} className={rotulo}>
                Criação do design, uma vez (min)
              </label>
              <input id={`${id}-criacao`} inputMode="decimal" value={minutosCriacao} onChange={(e) => setMinutosCriacao(e.target.value)} className={`${campo} w-24`} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-ink/80">
            <input type="checkbox" checked={pedidoSozinho} onChange={(e) => setPedidoSozinho(e.target.checked)} className="size-4 accent-ink" />
            Vai num pedido só dela (a embalagem inteira entra no orçamento, em vez do rateio médio)
          </label>
        </section>

        <section className="space-y-3 rounded-2xl border border-border bg-card px-5 py-5">
          <h2 className="font-serif text-lg font-semibold text-ink">Custo de uma unidade</h2>
          {custo === 0 ? (
            <p className="text-sm text-muted">Adicione materiais, custo de compra ou tempo pra ver a conta.</p>
          ) : (
            <table className="w-full max-w-xl text-sm">
              <tbody>
                {linhaCusto("Materiais (com impressão)", materiaisUnid)}
                {linhaCusto("Itens avulsos", avulsosUnid)}
                {linhaCusto("Custo de compra", compraUnid)}
                {linhaCusto("Mão de obra", maoDeObraUnid, valorHora ? `(${n(minutos)} min × ${formatarReais(hora)}/h)` : undefined)}
                {linhaCusto("Criação do design", criacaoUnid, unidades > 1 ? `(dividida por ${unidades} unidades)` : undefined)}
                <tr className="border-t-2 border-ink/30">
                  <td className="py-2 pr-3 font-semibold text-ink">Custo total</td>
                  <td className="py-2 text-right font-bold tabular-nums text-ink">{formatarReais(custo)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <section className="space-y-3 rounded-2xl bg-ink px-5 py-5 text-background">
          <p className="text-xs uppercase tracking-wide text-background/60">Preço</p>
          <p>
            <span className="text-sm text-background/70">Sugerido: </span>
            <span className="font-serif text-3xl font-semibold">{sugerido ? formatarReais(sugerido) : "—"}</span>
          </p>
          {sugerido && <p className="text-xs text-background/70">Preço de loja: {formatarReais(precoDeLoja(sugerido))}</p>}
          <div>
            <label htmlFor={`${id}-preco`} className="mb-1 block text-xs text-background/70">
              E se eu cobrar (por unidade)
            </label>
            <input
              id={`${id}-preco`}
              inputMode="decimal"
              placeholder={sugerido ? precoDeLoja(sugerido).toFixed(2).replace(".", ",") : ""}
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              className={`${campo} w-32`}
            />
          </div>
          {analise && (
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-background/70">Custo</dt>
                <dd className="tabular-nums">− {formatarReais(custo)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-background/70">Embalagem de envio</dt>
                <dd className="tabular-nums">− {formatarReais(analise.envio)}</dd>
              </div>
              {parametros.despesas.map((d) => (
                <div key={d.nome} className="flex justify-between gap-2">
                  <dt className="text-background/70">
                    {d.nome} ({pct(d.pct, 2)})
                  </dt>
                  <dd className="tabular-nums">− {formatarReais((valorPreco * d.pct) / 100)}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-2 border-t border-background/20 pt-1 font-semibold">
                <dt>Margem de contribuição</dt>
                <dd className="tabular-nums">
                  {formatarReais(analise.contribuicao)} ({pct(analise.contribuicaoPct)})
                </dd>
              </div>
              <div className="pt-1">
                <StatusPreco status={analise.status} />
              </div>
              {unidades > 1 && (
                <p className="pt-2 text-xs text-background/70">
                  Encomenda de {unidades}: {formatarReais(valorPreco * unidades)} no total, margem de{" "}
                  {formatarReais(analise.contribuicao * unidades)}.
                </p>
              )}
            </dl>
          )}
        </section>

        <section className="space-y-2 rounded-2xl border border-border bg-card px-5 py-4">
          <h2 className="text-sm font-semibold text-ink">Conselheira</h2>
          {avisos.length === 0 ? (
            <p className="text-xs text-muted">Monte o produto pra eu analisar.</p>
          ) : (
            <ul className="space-y-1.5">
              {avisos.map((a, i) => (
                <li key={i} className={`rounded-lg px-3 py-2 text-xs ${cor[a.tom]}`}>
                  {a.texto}
                </li>
              ))}
            </ul>
          )}
          <details className="pt-1 text-xs text-muted">
            <summary className="cursor-pointer font-semibold text-ink">Regras de ouro da saúde financeira</summary>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Preço vem do custo + margem, nunca só do concorrente. Revenda pode seguir o mercado; produção própria compensa.</li>
              <li>Seu tempo é custo: produção por unidade, criação dividida pela encomenda.</li>
              <li>Pró-labore fixo todo mês, e conta da empresa separada da pessoal.</li>
              <li>Reserva de pelo menos 3 meses de custos fixos ({formatarReais(parametros.totalFixos * 3)}) pros meses fracos.</li>
              <li>Material subiu? Registre a compra: o custo de tudo que usa ele muda junto. Revise os preços a cada trimestre.</li>
              <li>Cupom é custo: o preço já considera a média de desconto ({pct(parametros.despesas.find((d) => d.nome.toLowerCase().includes("cupo"))?.pct ?? 0, 2)}).</li>
              <li>Pedido pequeno de personalizado: pedido mínimo ou embalagem cobrada à parte.</li>
              <li>Acompanhe o medidor do MEI: com 80% do teto, o Simples entra no preço.</li>
            </ul>
          </details>
        </section>
      </aside>
    </div>
  );
}
