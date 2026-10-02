"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { campo } from "./estilos";

type Tipo = "revenda" | "producao_propria" | "";

// Na lista, classificar ja leva pra pagina do produto pra completar o custo
// (custo de compra na revenda, ficha tecnica na producao propria). Na
// propria pagina do produto, so atualiza.
export function ClassificarProduto({
  produtoId,
  tipo,
  abrirProdutoAoClassificar = false,
}: {
  produtoId: string;
  tipo: Tipo;
  abrirProdutoAoClassificar?: boolean;
}) {
  const router = useRouter();
  const [valor, setValor] = useState<Tipo>(tipo);
  const [erroMsg, setErroMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const novo = e.target.value as Tipo;
    const anterior = valor;
    setValor(novo);
    setErroMsg(null);

    const resultado = await enviar(`/api/financeiro/produtos/${produtoId}`, "PATCH", { tipo: novo || null });
    if (!resultado.ok) {
      setValor(anterior);
      setErroMsg(resultado.erro);
      return;
    }

    startTransition(() => {
      if (abrirProdutoAoClassificar && novo) router.push(`/financeiro/produtos/${produtoId}`);
      else router.refresh();
    });
  }

  return (
    <div>
      <select
        aria-label="Tipo do produto"
        value={valor}
        onChange={onChange}
        disabled={isPending}
        className={`${campo} text-xs`}
      >
        <option value="">Classificar...</option>
        <option value="producao_propria">Produção própria</option>
        <option value="revenda">Revenda</option>
      </select>
      {erroMsg && <p className="mt-1 text-xs text-alerta">{erroMsg}</p>}
    </div>
  );
}
