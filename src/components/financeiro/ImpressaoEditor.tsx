"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { formatarQuantidade, formatarReais, normalizarNumero, paraCampo } from "@/lib/financeiro/formato";
import { botaoPrimario, botaoSecundario, campo, rotulo } from "./estilos";

export type ItemImpressao = { id: string; folhas: number };

// Quantas folhas impressas vao em uma unidade (ou pedido). Nao escolhe
// impressora: toda folha conta frente e verso e usa o custo da impressora
// mais cara, que cobre mesmo quando imprime na outra. varianteId nulo =
// composicao do produto inteiro.
export function ImpressaoEditor({
  produtoId,
  baseUrl,
  por = "unidade",
  varianteId = null,
  itens,
  custoFolha,
  impressora,
}: {
  produtoId?: string;
  // de onde gravar; padrao = composicao do produto (a embalagem de envio usa outra rota)
  baseUrl?: string;
  por?: string; // "unidade" (produto) ou "pedido" (embalagem de envio)
  varianteId?: string | null;
  itens: ItemImpressao[];
  custoFolha: number | null; // da impressora mais cara
  impressora: string | null; // nome dela
}) {
  const id = useId();
  const base = baseUrl ?? `/api/financeiro/produtos/${produtoId}`;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // antes dava pra ter uma linha por impressora; soma, que a rota junta numa so
  const atual = itens.reduce((acc, i) => acc + i.folhas, 0);
  const [folhas, setFolhas] = useState(atual > 0 ? paraCampo(atual) : "");
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  async function salvar(valor: string) {
    setErroMsg(null);
    const resultado = await enviar(`${base}/impressao`, "POST", { folhas: normalizarNumero(valor), varianteId });
    if (!resultado.ok) {
      setErroMsg(resultado.erro);
      return;
    }
    if (valor === "0") setFolhas("");
    startTransition(() => router.refresh());
  }

  const alterado = folhas.trim() !== "" && Number(normalizarNumero(folhas)) !== atual;

  return (
    <div className="space-y-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          salvar(folhas);
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <div>
          <label htmlFor={`${id}-folhas`} className={rotulo}>
            Folhas impressas por {por} (frente e verso)
          </label>
          <input
            id={`${id}-folhas`}
            type="text"
            inputMode="decimal"
            placeholder="40"
            value={folhas}
            onChange={(e) => setFolhas(e.target.value)}
            className={`${campo} w-24`}
          />
        </div>
        {(alterado || atual === 0) && (
          <button type="submit" disabled={isPending || folhas.trim() === ""} className={botaoPrimario}>
            Salvar
          </button>
        )}
        {atual > 0 && (
          <button type="button" onClick={() => salvar("0")} disabled={isPending} className={botaoSecundario}>
            Tirar impressão
          </button>
        )}
        {atual > 0 && (
          <p className="pb-1.5 text-sm tabular-nums text-ink">
            {formatarQuantidade(atual)} {atual === 1 ? "folha" : "folhas"} ×{" "}
            {custoFolha !== null ? formatarReais(custoFolha, 4) : "?"} ={" "}
            <span className="font-semibold">{custoFolha !== null ? formatarReais(atual * custoFolha) : "—"}</span>
          </p>
        )}
      </form>
      <p className="text-xs text-muted">
        {custoFolha !== null ? (
          <>
            Custo da folha: {formatarReais(custoFolha, 4)} ({impressora}, a impressora mais cara — cobre mesmo quando
            imprime na outra).
          </>
        ) : (
          <>
            Falta o custo da folha: informe as páginas por ano de pelo menos uma impressora em{" "}
            <Link href="/financeiro/impressoras" className="text-alerta underline">
              Impressoras
            </Link>
            .
          </>
        )}
      </p>
      {erroMsg && <p className="text-xs text-alerta">{erroMsg}</p>}
    </div>
  );
}
