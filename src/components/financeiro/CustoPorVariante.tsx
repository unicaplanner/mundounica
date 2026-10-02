"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { enviar } from "@/lib/financeiro/enviar";

const OPCOES = [
  { valor: false, titulo: "Mesmo custo pra todas", detalhe: "As variantes só mudam cor ou estampa." },
  { valor: true, titulo: "Cada variante tem seu custo", detalhe: "Muda o tamanho do papel, a gramatura, o acabamento..." },
];

export function CustoPorVariante({
  produtoId,
  custoPorVariante,
  totalVariantes,
}: {
  produtoId: string;
  custoPorVariante: boolean;
  totalVariantes: number;
}) {
  const nome = useId();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [valor, setValor] = useState(custoPorVariante);
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  async function escolher(novo: boolean) {
    if (novo === valor) return;
    setErroMsg(null);
    setValor(novo);
    const resultado = await enviar(`/api/financeiro/produtos/${produtoId}`, "PATCH", { custoPorVariante: novo });
    if (!resultado.ok) {
      setValor(!novo);
      setErroMsg(resultado.erro);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <fieldset className="space-y-2" disabled={isPending}>
      <legend className="mb-2 text-sm text-muted">
        Esse produto tem {totalVariantes} variantes no Shopify. O custo muda de uma pra outra?
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {OPCOES.map((o) => (
          <label
            key={String(o.valor)}
            className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-sm transition ${
              valor === o.valor ? "border-ink bg-card" : "border-border hover:border-accent-ink"
            }`}
          >
            <input
              type="radio"
              name={nome}
              checked={valor === o.valor}
              onChange={() => escolher(o.valor)}
              className="mt-1 accent-[var(--ink)]"
            />
            <span>
              <span className="block font-semibold text-ink">{o.titulo}</span>
              <span className="block text-xs text-muted">{o.detalhe}</span>
            </span>
          </label>
        ))}
      </div>
      {!custoPorVariante && (
        <p className="text-xs text-muted">
          Ao escolher &ldquo;cada variante tem seu custo&rdquo;, todas as variantes começam com uma cópia da composição
          atual. Aí é só ajustar o que muda em cada uma.
        </p>
      )}
      {erroMsg && <p className="text-xs text-alerta">{erroMsg}</p>}
    </fieldset>
  );
}
