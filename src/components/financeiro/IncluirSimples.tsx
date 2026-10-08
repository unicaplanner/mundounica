"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { normalizarNumero } from "@/lib/financeiro/formato";
import { botaoPrimario, campo } from "./estilos";

// Inclui o Simples Nacional como despesa por venda (aliquota editavel; a
// efetiva o contador informa).
export function IncluirSimples() {
  const id = useId();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [aliquota, setAliquota] = useState("6");
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  async function incluir(e: React.FormEvent) {
    e.preventDefault();
    setErroMsg(null);
    const resultado = await enviar("/api/financeiro/despesas-variaveis", "POST", {
      nome: "Simples Nacional",
      percentual: normalizarNumero(aliquota),
    });
    if (!resultado.ok) {
      setErroMsg(resultado.erro);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={incluir} className="flex flex-wrap items-end gap-2">
      <div>
        <label htmlFor={`${id}-aliquota`} className="mb-1 block text-xs">
          Alíquota (%)
        </label>
        <input
          id={`${id}-aliquota`}
          inputMode="decimal"
          value={aliquota}
          onChange={(e) => setAliquota(e.target.value)}
          className={`${campo} w-20`}
        />
      </div>
      <button type="submit" disabled={isPending} className={botaoPrimario}>
        Incluir Simples nas despesas por venda
      </button>
      {erroMsg && <p className="w-full text-xs">{erroMsg}</p>}
    </form>
  );
}
