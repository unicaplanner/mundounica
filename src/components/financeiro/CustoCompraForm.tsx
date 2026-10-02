"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { botaoPrimario, campo, rotulo } from "./estilos";

// varianteId nulo = custo de compra unico do produto; com variante, o custo
// e so daquela variante.
export function CustoCompraForm({
  produtoId,
  varianteId = null,
  custoCompra,
}: {
  produtoId: string;
  varianteId?: string | null;
  custoCompra: number | null;
}) {
  const id = useId();
  const router = useRouter();
  const [valor, setValor] = useState(custoCompra?.toLocaleString("pt-BR") ?? "");
  const [mensagem, setMensagem] = useState<{ texto: string; erro: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMensagem(null);
    const url = varianteId ? `/api/financeiro/variantes/${varianteId}` : `/api/financeiro/produtos/${produtoId}`;
    const resultado = await enviar(url, "PATCH", {
      custoCompra: valor.trim() === "" ? null : valor,
    });
    if (!resultado.ok) {
      setMensagem({ texto: resultado.erro, erro: true });
      return;
    }
    setMensagem({ texto: "Custo salvo.", erro: false });
    startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor={`${id}-custo`} className={rotulo}>
          Custo de compra por unidade (R$)
        </label>
        <input
          id={`${id}-custo`}
          type="text"
          inputMode="decimal"
          placeholder="12,50"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className={`${campo} w-32`}
        />
      </div>
      <button type="submit" disabled={isPending} className={botaoPrimario}>
        Salvar custo
      </button>
      {mensagem && (
        <p role="status" className={`pb-1.5 text-xs ${mensagem.erro ? "text-alerta" : "text-muted"}`}>
          {mensagem.texto}
        </p>
      )}
    </form>
  );
}
