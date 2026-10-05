"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { normalizarBusca, normalizarNumero } from "@/lib/financeiro/formato";
import { botaoPrimario, botaoSecundario, campo, rotulo } from "./estilos";

export type ProdutoLote = {
  id: string;
  title: string;
  tipo: string | null;
  arquivado: boolean;
  custoPorVariante: boolean;
  variantes: { id: string; title: string }[];
};
// [produtoId, varianteId ou "", materialId] de cada linha de ficha tecnica
export type FichaLote = [string, string, string];

type Resultado = { titulo: string; aplicado: boolean; motivo?: string; onde?: string };

const termos = (texto: string) =>
  texto
    .split(",")
    .map((t) => normalizarBusca(t.trim()))
    .filter(Boolean);

// "Colocar um material em varios produtos": ex. o saco 15x25 em todas as
// variantes A5 de tudo que nao e case nem divisoria transparente. Mostra a
// lista pra conferir antes de aplicar.
export function AplicarMaterialLote({
  materiais,
  produtos,
  ficha,
}: {
  materiais: { id: string; nome: string; unidade: string }[];
  produtos: ProdutoLote[];
  ficha: FichaLote[];
}) {
  const id = useId();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [materialId, setMaterialId] = useState(materiais[0]?.id ?? "");
  const [quantidade, setQuantidade] = useState("1");
  const [variantesCom, setVariantesCom] = useState("A5");
  const [foraCom, setForaCom] = useState("case, fichário, divisórias transparentes, divisória transparente, 100% off, +");
  const [classificar, setClassificar] = useState(true);
  const [arquivados, setArquivados] = useState(false);
  const [desmarcados, setDesmarcados] = useState<Set<string>>(new Set());
  const [confirmando, setConfirmando] = useState(false);
  const [erroMsg, setErroMsg] = useState<string | null>(null);
  const [resultados, setResultados] = useState<Resultado[] | null>(null);

  const temMaterial = useMemo(() => new Set(ficha.filter((f) => f[2] === materialId).map((f) => `${f[0]}|${f[1]}`)), [ficha, materialId]);

  const { lista, deFora } = useMemo(() => {
    const incluir = termos(variantesCom);
    const excluir = termos(foraCom);
    let deFora = 0;
    const lista = [];
    for (const p of produtos) {
      if (p.arquivado && !arquivados) continue;
      const titulo = normalizarBusca(p.title);
      if (excluir.some((t) => titulo.includes(t))) continue;
      const semVariantes = p.variantes.length === 1 && p.variantes[0].title === "Default Title";
      const escolhidas = p.variantes.filter((v) => {
        const alvo = normalizarBusca(semVariantes ? p.title : v.title);
        return incluir.length === 0 || incluir.some((t) => alvo.includes(t));
      });
      if (escolhidas.length === 0) continue;
      if (p.tipo && p.tipo !== "producao_propria") {
        deFora += 1;
        continue;
      }
      if (!p.tipo && !classificar) continue;
      const todas = escolhidas.length === p.variantes.length;
      const jaTem =
        !p.custoPorVariante && todas ? temMaterial.has(`${p.id}|`) : escolhidas.every((v) => temMaterial.has(`${p.id}|${v.id}`));
      lista.push({ ...p, escolhidas, todas, jaTem, semVariantes });
    }
    return { lista, deFora };
  }, [produtos, variantesCom, foraCom, classificar, arquivados, temMaterial]);

  const marcados = lista.filter((p) => !desmarcados.has(p.id));
  const material = materiais.find((m) => m.id === materialId);

  function alternar(pid: string) {
    setConfirmando(false);
    setDesmarcados((atual) => {
      const novo = new Set(atual);
      if (novo.has(pid)) novo.delete(pid);
      else novo.add(pid);
      return novo;
    });
  }

  async function aplicar() {
    setErroMsg(null);
    const resultado = await enviar(`/api/financeiro/materiais/${materialId}/aplicar`, "POST", {
      quantidade: normalizarNumero(quantidade),
      classificar,
      alvos: marcados.map((p) => ({ produtoId: p.id, varianteIds: p.escolhidas.map((v) => v.id) })),
    });
    setConfirmando(false);
    if (!resultado.ok) {
      setErroMsg(resultado.erro);
      return;
    }
    setResultados(resultado.dados.resultados as Resultado[]);
    startTransition(() => router.refresh());
  }

  return (
    <details className="group rounded-2xl border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 text-sm font-semibold text-ink marker:hidden">
        <span className="text-muted transition group-open:rotate-90" aria-hidden="true">
          ›
        </span>
        Colocar um material em vários produtos
      </summary>
      <div className="space-y-4 px-5 pb-5">
        <p className="text-xs text-muted">
          Ex: o saco 15x25 em todas as variantes A5. Nos produtos que têm outras variantes (ex: Personal), cada variante
          passa a ter seu próprio custo, começando com o que o produto já tinha. Revenda, kit e &quot;não contar&quot; ficam de
          fora.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor={`${id}-material`} className={rotulo}>
              Material
            </label>
            <select
              id={`${id}-material`}
              value={materialId}
              onChange={(e) => {
                setMaterialId(e.target.value);
                setResultados(null);
              }}
              className={campo}
            >
              {materiais.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-qtd`} className={rotulo}>
              Quantidade por unidade{material ? ` (${material.unidade})` : ""}
            </label>
            <input
              id={`${id}-qtd`}
              inputMode="decimal"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              className={`${campo} w-20`}
            />
          </div>
          <div>
            <label htmlFor={`${id}-com`} className={rotulo}>
              Só variantes com (separe por vírgula)
            </label>
            <input id={`${id}-com`} value={variantesCom} onChange={(e) => setVariantesCom(e.target.value)} className={`${campo} w-44`} />
          </div>
          <div className="min-w-0 flex-1 basis-64">
            <label htmlFor={`${id}-fora`} className={rotulo}>
              Deixar de fora produtos com
            </label>
            <input id={`${id}-fora`} value={foraCom} onChange={(e) => setForaCom(e.target.value)} className={`${campo} w-full`} />
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-ink/80">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={classificar} onChange={(e) => setClassificar(e.target.checked)} className="size-4 accent-ink" />
            Incluir os ainda sem classificação (viram produção própria)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={arquivados} onChange={(e) => setArquivados(e.target.checked)} className="size-4 accent-ink" />
            Incluir arquivados no Shopify
          </label>
        </div>

        <p className="text-xs text-muted">
          {lista.length} {lista.length === 1 ? "produto encontrado" : "produtos encontrados"}
          {deFora > 0 && ` · ${deFora} de fora por serem revenda, kit ou "não contar"`}
        </p>
        {lista.length > 0 && (
          <ul className="max-h-96 divide-y divide-border overflow-y-auto border-y border-border">
            {lista.map((p) => (
              <li key={p.id}>
                <label className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!desmarcados.has(p.id)}
                    onChange={() => alternar(p.id)}
                    className="size-4 accent-ink"
                  />
                  <span className="min-w-0 flex-1 basis-56 text-ink">{p.title}</span>
                  <span className="flex flex-wrap gap-2 text-xs text-muted">
                    {!p.semVariantes && (
                      <span>
                        {p.todas ? "todas as variantes" : `${p.escolhidas.map((v) => v.title).join(", ")} (${p.escolhidas.length} de ${p.variantes.length})`}
                      </span>
                    )}
                    {!p.tipo && <span className="text-atencao">sem classificação</span>}
                    {p.jaTem && <span className="text-ok">já tem</span>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}

        {marcados.length > 0 && !confirmando && (
          <button type="button" onClick={() => setConfirmando(true)} className={botaoPrimario}>
            Colocar em {marcados.length} {marcados.length === 1 ? "produto" : "produtos"}
          </button>
        )}
        {confirmando && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-atencao-soft px-4 py-3 text-sm text-atencao">
            <span>
              Colocar {quantidade} {material?.unidade} de {material?.nome} em {marcados.length}{" "}
              {marcados.length === 1 ? "produto" : "produtos"}?
            </span>
            <button type="button" onClick={aplicar} disabled={isPending} className={`${botaoPrimario} py-1 text-xs`}>
              Confirmar
            </button>
            <button type="button" onClick={() => setConfirmando(false)} className={botaoSecundario}>
              Cancelar
            </button>
          </div>
        )}
        {erroMsg && <p className="text-xs text-alerta">{erroMsg}</p>}
        {resultados && (
          <div role="status" className="space-y-1 rounded-xl bg-ok-soft px-4 py-3 text-xs text-ok">
            <p className="font-semibold">
              Colocado em {resultados.filter((r) => r.aplicado).length} de {resultados.length}.
            </p>
            {resultados
              .filter((r) => !r.aplicado)
              .map((r) => (
                <p key={r.titulo} className="text-ink/80">
                  {r.titulo}: não aplicado ({r.motivo}).
                </p>
              ))}
          </div>
        )}
      </div>
    </details>
  );
}
