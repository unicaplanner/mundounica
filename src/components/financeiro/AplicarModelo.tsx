"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { formatarReais, normalizarBusca, normalizarVariante } from "@/lib/financeiro/formato";
import { botaoPrimario, botaoSecundario, campo } from "./estilos";

export type CandidatoModelo = {
  id: string;
  title: string;
  tipo: string | null;
  variantes: string[];
  temComposicao: boolean;
  receita: number;
};

type Resultado = { titulo: string; aplicado: boolean; motivo?: string; variantesSemPar?: string[] };

const ROTULO_TIPO: Record<string, string> = {
  producao_propria: "Produção própria",
  revenda: "Revenda",
  kit: "Kit",
  ignorar: "Não contar",
};
const MOSTRAR = 80;

// "Usar esta composicao em outros produtos": pros produtos que se repetem
// (mesma estrutura, so muda capa/estampa), monta a ficha uma vez e copia.
export function AplicarModelo({
  produtoId,
  porVariante,
  variantesOrigem,
  candidatos,
}: {
  produtoId: string;
  porVariante: boolean;
  variantesOrigem: string[];
  candidatos: CandidatoModelo[];
}) {
  const id = useId();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busca, setBusca] = useState("");
  const [soMesmas, setSoMesmas] = useState(porVariante);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [confirmando, setConfirmando] = useState(false);
  const [erroMsg, setErroMsg] = useState<string | null>(null);
  const [resultados, setResultados] = useState<Resultado[] | null>(null);

  const nomesOrigem = useMemo(() => new Set(variantesOrigem.map(normalizarVariante)), [variantesOrigem]);
  const comPar = (c: CandidatoModelo) => c.variantes.filter((v) => nomesOrigem.has(normalizarVariante(v))).length;

  const lista = useMemo(() => {
    const termo = normalizarBusca(busca.trim());
    return candidatos
      .filter((c) => !termo || normalizarBusca(c.title).includes(termo))
      .filter((c) => !soMesmas || comPar(c) === c.variantes.length)
      .sort((a, b) => b.receita - a.receita || a.title.localeCompare(b.title, "pt-BR"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidatos, busca, soMesmas, nomesOrigem]);

  const escolhidos = candidatos.filter((c) => marcados.has(c.id));
  const substituidos = escolhidos.filter((c) => c.temComposicao).length;

  function alternar(cid: string) {
    setConfirmando(false);
    setMarcados((atual) => {
      const novo = new Set(atual);
      if (novo.has(cid)) novo.delete(cid);
      else novo.add(cid);
      return novo;
    });
  }

  async function aplicar() {
    setErroMsg(null);
    const resultado = await enviar(`/api/financeiro/produtos/${produtoId}/modelo`, "POST", { destinos: [...marcados] });
    setConfirmando(false);
    if (!resultado.ok) {
      setErroMsg(resultado.erro);
      return;
    }
    setResultados(resultado.dados.resultados as Resultado[]);
    setMarcados(new Set());
    startTransition(() => router.refresh());
  }

  return (
    <details className="group rounded-2xl border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 text-sm font-semibold text-ink marker:hidden">
        <span className="text-muted transition group-open:rotate-90" aria-hidden="true">
          ›
        </span>
        Usar esta composição como modelo em outros produtos
      </summary>
      <div className="space-y-4 px-5 pb-5">
        <p className="text-xs text-muted">
          Pros produtos com a mesma estrutura (muda só capa ou estampa): eles ficam com o mesmo tipo e uma cópia desta
          composição.
          {porVariante &&
            " Como este produto tem custo por variante, cada variante copia a variante deste produto com o mesmo nome."}{" "}
          A composição que eles já tinham é substituída.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor={`${id}-busca`} className="sr-only">
            Buscar produto
          </label>
          <input
            id={`${id}-busca`}
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produto..."
            className={`${campo} w-56`}
          />
          {porVariante && (
            <label className="flex items-center gap-2 text-xs text-ink/80">
              <input
                type="checkbox"
                checked={soMesmas}
                onChange={(e) => setSoMesmas(e.target.checked)}
                className="size-4 accent-ink"
              />
              Só produtos com as mesmas variantes
            </label>
          )}
          <button
            type="button"
            onClick={() => {
              setConfirmando(false);
              setMarcados(new Set(lista.slice(0, MOSTRAR).map((c) => c.id)));
            }}
            className={botaoSecundario}
          >
            Marcar os {Math.min(lista.length, MOSTRAR)} da lista
          </button>
          {marcados.size > 0 && (
            <button type="button" onClick={() => setMarcados(new Set())} className="text-xs text-muted underline">
              Desmarcar todos
            </button>
          )}
        </div>

        {lista.length === 0 ? (
          <p className="text-sm text-muted">
            Nenhum produto encontrado{soMesmas ? " com as mesmas variantes" : ""}.
          </p>
        ) : (
          <ul className="max-h-96 divide-y divide-border overflow-y-auto border-y border-border">
            {lista.slice(0, MOSTRAR).map((c) => {
              const pares = comPar(c);
              return (
                <li key={c.id}>
                  <label className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={marcados.has(c.id)}
                      onChange={() => alternar(c.id)}
                      className="size-4 accent-ink"
                    />
                    <span className="min-w-0 flex-1 basis-56 text-ink">{c.title}</span>
                    <span className="flex flex-wrap gap-2 text-xs text-muted">
                      {c.tipo && <span>{ROTULO_TIPO[c.tipo] ?? c.tipo}</span>}
                      {porVariante && (
                        <span className={pares < c.variantes.length ? "text-alerta" : ""}>
                          {pares} de {c.variantes.length} variantes com o mesmo nome
                        </span>
                      )}
                      {c.temComposicao && <span className="text-atencao">já tem composição</span>}
                      {c.receita > 0 && <span>{formatarReais(c.receita)} em 12 meses</span>}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        {lista.length > MOSTRAR && (
          <p className="text-xs text-muted">Mostrando {MOSTRAR} de {lista.length}. Use a busca pra achar outros.</p>
        )}

        {marcados.size > 0 && !confirmando && (
          <button type="button" onClick={() => setConfirmando(true)} className={botaoPrimario}>
            Aplicar em {marcados.size} {marcados.size === 1 ? "produto" : "produtos"}
          </button>
        )}
        {confirmando && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-atencao-soft px-4 py-3 text-sm text-atencao">
            <span>
              Copiar esta composição pra {marcados.size} {marcados.size === 1 ? "produto" : "produtos"}?
              {substituidos > 0 && ` ${substituidos} já ${substituidos === 1 ? "tem" : "têm"} composição, que vai ser substituída.`}
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
              Modelo aplicado em {resultados.filter((r) => r.aplicado).length} de {resultados.length}.
            </p>
            {resultados
              .filter((r) => !r.aplicado || r.variantesSemPar?.length)
              .map((r) => (
                <p key={r.titulo} className="text-ink/80">
                  {r.titulo}:{" "}
                  {r.aplicado
                    ? `sem variante com o mesmo nome pra ${r.variantesSemPar!.join(", ")} — complete na página dele.`
                    : `não aplicado (${r.motivo}).`}
                </p>
              ))}
          </div>
        )}
      </div>
    </details>
  );
}
