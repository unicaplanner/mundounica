"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { formatarQuantidade, formatarReais, normalizarNumero, paraCampo } from "@/lib/financeiro/formato";
import { UNIDADES } from "@/lib/financeiro/unidades";
import { IconeLapis, IconeLixeira, botaoIcone } from "./Icones";
import { botaoPrimario, botaoSecundario, campo, rotulo } from "./estilos";

type Material = { id: string; nome: string; unidade: string; custoAtual: number };
export type ItemFicha = { id: string; quantidade: number; material: Material };
export type ItemImpressao = { id: string; folhas: number };

const NOVO = "__novo__";
const IMPRESSAO = "__impressao__"; // id da linha de impressao na tabela

// O que vai pra produzir uma unidade (ou montar um pedido): materiais e a
// impressao na mesma tabela, porque a folha sem impressao nao e o produto.
// Impressao = folhas frente e verso com o custo da impressora mais cara.
// varianteId nulo = composicao do produto inteiro. Pode aparecer varias vezes
// na mesma pagina (uma por variante), por isso os ids vem de useId.
export function ProducaoEditor({
  produtoId,
  baseUrl,
  por = "unidade",
  varianteId = null,
  itens,
  materiais,
  impressao,
  custoFolha,
  impressora,
  textoVazio = "Nada cadastrado ainda. Adicione o papel, a capa, o saquinho e a impressão de uma unidade.",
  rotuloTotal = "Custo pra produzir uma unidade",
}: {
  produtoId?: string;
  // de onde gravar; padrao = composicao do produto (a embalagem de envio usa outra rota)
  baseUrl?: string;
  por?: string; // "unidade" (produto) ou "pedido" (embalagem de envio)
  varianteId?: string | null;
  itens: ItemFicha[];
  materiais: Material[];
  impressao: ItemImpressao[];
  custoFolha: number | null;
  impressora: string | null;
  textoVazio?: string;
  rotuloTotal?: string;
}) {
  const id = useId();
  const base = baseUrl ?? `/api/financeiro/produtos/${produtoId}`;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [abrir, setAbrir] = useState<"material" | "impressao" | null>(null);
  const [materialId, setMaterialId] = useState(materiais[0]?.id ?? NOVO);
  const [quantidade, setQuantidade] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [novaUnidade, setNovaUnidade] = useState("folha");
  const [folhasNovas, setFolhasNovas] = useState("");
  const [erroMsg, setErroMsg] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [qtdEdicao, setQtdEdicao] = useState("");
  const [excluindo, setExcluindo] = useState<string | null>(null);

  // antes dava pra ter uma linha de impressao por impressora; soma (a rota junta)
  const folhas = impressao.reduce((acc, i) => acc + i.folhas, 0);
  const criandoMaterial = materialId === NOVO;
  const unidade = criandoMaterial ? novaUnidade : materiais.find((m) => m.id === materialId)?.unidade;

  const atualizar = () => startTransition(() => router.refresh());

  async function gravarMaterial(matId: string, qtd: string) {
    return enviar(`${base}/ficha`, "POST", { materialId: matId, quantidade: normalizarNumero(qtd), varianteId });
  }
  async function gravarFolhas(valor: string) {
    return enviar(`${base}/impressao`, "POST", { folhas: normalizarNumero(valor), varianteId });
  }

  async function adicionarMaterial(e: React.FormEvent) {
    e.preventDefault();
    setErroMsg(null);
    setEnviando(true);
    let idParaAdicionar = materialId;
    if (criandoMaterial) {
      const criado = await enviar("/api/financeiro/materiais", "POST", { nome: novoNome, unidade: novaUnidade });
      if (!criado.ok) {
        setErroMsg(criado.erro);
        setEnviando(false);
        return;
      }
      idParaAdicionar = String(criado.dados.id);
    }
    const resultado = await gravarMaterial(idParaAdicionar, quantidade);
    setEnviando(false);
    if (!resultado.ok) {
      setErroMsg(resultado.erro);
      return;
    }
    setQuantidade("");
    setNovoNome("");
    setMaterialId(idParaAdicionar);
    setAbrir(null);
    atualizar();
  }

  async function adicionarImpressao(e: React.FormEvent) {
    e.preventDefault();
    setErroMsg(null);
    const resultado = await gravarFolhas(folhasNovas);
    if (!resultado.ok) {
      setErroMsg(resultado.erro);
      return;
    }
    setFolhasNovas("");
    setAbrir(null);
    atualizar();
  }

  async function salvarEdicao(item?: ItemFicha) {
    setErroMsg(null);
    const resultado = item ? await gravarMaterial(item.material.id, qtdEdicao) : await gravarFolhas(qtdEdicao);
    if (!resultado.ok) {
      setErroMsg(resultado.erro);
      return;
    }
    setEditando(null);
    atualizar();
  }

  async function remover(linha: string) {
    setExcluindo(null);
    setErroMsg(null);
    const resultado =
      linha === IMPRESSAO ? await gravarFolhas("0") : await enviar(`${base}/ficha/${linha}`, "DELETE");
    if (!resultado.ok) {
      setErroMsg(resultado.erro);
      return;
    }
    atualizar();
  }

  const custoImpressao = folhas * (custoFolha ?? 0);
  const total = itens.reduce((acc, item) => acc + item.quantidade * item.material.custoAtual, 0) + custoImpressao;
  const vazio = itens.length === 0 && folhas === 0;

  // Acoes de uma linha: lapis/lixeira, ou salvar/cancelar, ou confirmar exclusao.
  const acoes = (linha: string, nome: string, valorAtual: number, item?: ItemFicha) =>
    editando === linha ? (
      <div className="flex justify-end gap-2 whitespace-nowrap">
        <button
          type="button"
          onClick={() => salvarEdicao(item)}
          disabled={isPending}
          className={`${botaoPrimario} px-3 py-1 text-xs`}
        >
          Salvar
        </button>
        <button type="button" onClick={() => setEditando(null)} className={botaoSecundario}>
          Cancelar
        </button>
      </div>
    ) : excluindo === linha ? (
      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
        <span className="text-xs font-semibold text-alerta">Tirar?</span>
        <button
          type="button"
          onClick={() => remover(linha)}
          disabled={isPending}
          className="rounded-full bg-alerta px-3 py-1 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          Tirar
        </button>
        <button type="button" onClick={() => setExcluindo(null)} className={botaoSecundario}>
          Cancelar
        </button>
      </div>
    ) : (
      <div className="flex justify-end gap-1">
        <button
          type="button"
          onClick={() => {
            setExcluindo(null);
            setEditando(linha);
            setQtdEdicao(paraCampo(valorAtual));
          }}
          aria-label={`Editar quantidade de ${nome}`}
          title="Editar quantidade"
          className={botaoIcone}
        >
          <IconeLapis />
        </button>
        <button
          type="button"
          onClick={() => {
            setEditando(null);
            setExcluindo(linha);
          }}
          aria-label={`Tirar ${nome}`}
          title="Tirar"
          className={botaoIcone}
        >
          <IconeLixeira />
        </button>
      </div>
    );

  const campoEdicao = (nome: string, sufixo: string) => (
    <span className="flex items-center gap-1">
      <input
        type="text"
        inputMode="decimal"
        aria-label={`Quantidade de ${nome}`}
        value={qtdEdicao}
        onChange={(e) => setQtdEdicao(e.target.value)}
        className={`${campo} w-20 py-1 text-xs`}
      />
      <span className="text-xs text-muted">{sufixo}</span>
    </span>
  );

  return (
    <div className="space-y-3">
      {vazio ? (
        <p className="text-sm text-muted">{textoVazio}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm [&_td]:pr-4 [&_th]:pr-4">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="pb-2 font-semibold">Item</th>
                <th className="pb-2 font-semibold">Quantidade</th>
                <th className="pb-2 font-semibold">Custo unitário</th>
                <th className="pb-2 text-right font-semibold">Subtotal</th>
                <th className="pb-2">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr
                  key={item.id}
                  className={`border-t border-border ${editando === item.id ? "bg-accent-soft/60" : ""} ${excluindo === item.id ? "bg-alerta-soft" : ""}`}
                >
                  <td className="py-2.5 text-ink">{item.material.nome}</td>
                  <td className="py-2.5 tabular-nums">
                    {editando === item.id
                      ? campoEdicao(item.material.nome, item.material.unidade)
                      : `${formatarQuantidade(item.quantidade)} ${item.material.unidade}`}
                  </td>
                  <td className="py-2.5 tabular-nums">
                    {item.material.custoAtual === 0 ? (
                      <Link href="/financeiro/compras" className="text-xs text-alerta underline">
                        sem compra registrada
                      </Link>
                    ) : (
                      <span className="text-muted">{formatarReais(item.material.custoAtual, 4)}</span>
                    )}
                  </td>
                  <td className="py-2.5 text-right font-semibold tabular-nums">
                    {formatarReais(item.quantidade * item.material.custoAtual)}
                  </td>
                  <td className="py-1.5 pl-3 text-right">{acoes(item.id, item.material.nome, item.quantidade, item)}</td>
                </tr>
              ))}
              {folhas > 0 && (
                <tr
                  className={`border-t border-border ${editando === IMPRESSAO ? "bg-accent-soft/60" : ""} ${excluindo === IMPRESSAO ? "bg-alerta-soft" : ""}`}
                >
                  <td className="py-2.5 text-ink">
                    Impressão <span className="text-xs text-muted">(frente e verso)</span>
                  </td>
                  <td className="py-2.5 tabular-nums">
                    {editando === IMPRESSAO
                      ? campoEdicao("folhas impressas", "folhas")
                      : `${formatarQuantidade(folhas)} ${folhas === 1 ? "folha" : "folhas"}`}
                  </td>
                  <td className="py-2.5 tabular-nums">
                    {custoFolha === null ? (
                      <Link href="/financeiro/impressoras" className="text-xs text-alerta underline">
                        falta páginas/ano da impressora
                      </Link>
                    ) : (
                      <span className="text-muted" title={`${impressora}, a impressora mais cara — cobre mesmo quando imprime na outra`}>
                        {formatarReais(custoFolha, 4)}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-right font-semibold tabular-nums">{formatarReais(custoImpressao)}</td>
                  <td className="py-1.5 pl-3 text-right">{acoes(IMPRESSAO, "a impressão", folhas)}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-ink/20">
                <td colSpan={3} className="pt-2.5 text-right text-xs font-semibold text-muted">
                  {rotuloTotal}
                </td>
                <td className="pt-2.5 text-right font-bold tabular-nums text-ink">{formatarReais(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {abrir === null && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setAbrir("material")} className={botaoSecundario}>
            + Adicionar material
          </button>
          {folhas === 0 && (
            <button type="button" onClick={() => setAbrir("impressao")} className={botaoSecundario}>
              + Adicionar impressão
            </button>
          )}
        </div>
      )}

      {abrir === "material" && (
        <form onSubmit={adicionarMaterial} className="flex flex-wrap items-end gap-3 rounded-xl bg-accent-soft/50 p-3">
          <div>
            <label htmlFor={`${id}-material`} className={rotulo}>
              Material
            </label>
            <select id={`${id}-material`} value={materialId} onChange={(e) => setMaterialId(e.target.value)} className={campo}>
              {materiais.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome} ({m.unidade})
                </option>
              ))}
              <option value={NOVO}>+ Cadastrar material novo</option>
            </select>
          </div>
          {criandoMaterial && (
            <>
              <div>
                <label htmlFor={`${id}-novo-nome`} className={rotulo}>
                  Nome do material novo
                </label>
                <input
                  id={`${id}-novo-nome`}
                  type="text"
                  placeholder="Saquinho PP"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  className={`${campo} w-48`}
                />
              </div>
              <div>
                <label htmlFor={`${id}-nova-unidade`} className={rotulo}>
                  Unidade
                </label>
                <select id={`${id}-nova-unidade`} value={novaUnidade} onChange={(e) => setNovaUnidade(e.target.value)} className={campo}>
                  {UNIDADES.map((u) => (
                    <option key={u.valor} value={u.valor}>
                      {u.rotulo}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          <div>
            <label htmlFor={`${id}-quantidade`} className={rotulo}>
              Quantidade por {por}
              {unidade ? ` (${unidade})` : ""}
            </label>
            <input
              id={`${id}-quantidade`}
              type="text"
              inputMode="decimal"
              placeholder="1"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              className={`${campo} w-24`}
            />
          </div>
          <button type="submit" disabled={enviando || isPending} className={botaoPrimario}>
            {criandoMaterial ? "Criar e adicionar" : "Adicionar"}
          </button>
          <button type="button" onClick={() => setAbrir(null)} className={botaoSecundario}>
            Cancelar
          </button>
        </form>
      )}

      {abrir === "impressao" && (
        <form onSubmit={adicionarImpressao} className="flex flex-wrap items-end gap-3 rounded-xl bg-accent-soft/50 p-3">
          <div>
            <label htmlFor={`${id}-folhas`} className={rotulo}>
              Folhas impressas por {por} (frente e verso)
            </label>
            <input
              id={`${id}-folhas`}
              type="text"
              inputMode="decimal"
              placeholder="40"
              value={folhasNovas}
              onChange={(e) => setFolhasNovas(e.target.value)}
              className={`${campo} w-24`}
            />
          </div>
          <button type="submit" disabled={isPending} className={botaoPrimario}>
            Adicionar
          </button>
          <button type="button" onClick={() => setAbrir(null)} className={botaoSecundario}>
            Cancelar
          </button>
          <p className="w-full text-xs text-muted">
            {custoFolha !== null
              ? `Custo da folha: ${formatarReais(custoFolha, 4)} (${impressora}, a impressora mais cara — cobre mesmo quando imprime na outra).`
              : "Falta informar as páginas por ano de uma impressora na aba Impressoras."}
          </p>
        </form>
      )}

      {erroMsg && <p className="text-xs text-alerta">{erroMsg}</p>}
    </div>
  );
}
