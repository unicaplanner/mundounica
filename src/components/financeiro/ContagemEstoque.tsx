"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { normalizarNumero } from "@/lib/financeiro/formato";
import { botaoPrimario, campo, rotulo } from "./estilos";

const hoje = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

// Registrar uma contagem de estoque (o ponto de partida da baixa pelas vendas).
export function ContagemEstoque({ materialId, unidade }: { materialId: string; unidade: string }) {
  const id = useId();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [quantidade, setQuantidade] = useState("");
  const [data, setData] = useState(hoje);
  const [mensagem, setMensagem] = useState<{ texto: string; erro: boolean } | null>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setMensagem(null);
    const resultado = await enviar(`/api/financeiro/materiais/${materialId}/estoque`, "POST", {
      quantidade: normalizarNumero(quantidade),
      data,
    });
    if (!resultado.ok) {
      setMensagem({ texto: resultado.erro, erro: true });
      return;
    }
    setQuantidade("");
    setMensagem({ texto: "Contagem registrada.", erro: false });
    startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={salvar} className="flex flex-wrap items-end gap-2">
      <div>
        <label htmlFor={`${id}-qtd`} className={rotulo}>
          Contei agora ({unidade})
        </label>
        <input id={`${id}-qtd`} inputMode="decimal" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className={`${campo} w-28`} />
      </div>
      <div>
        <label htmlFor={`${id}-data`} className={rotulo}>
          Data da contagem
        </label>
        <input id={`${id}-data`} type="date" value={data} onChange={(e) => setData(e.target.value)} className={campo} />
      </div>
      <button type="submit" disabled={isPending || !quantidade.trim()} className={botaoPrimario}>
        Registrar contagem
      </button>
      {mensagem && <p className={`w-full text-xs ${mensagem.erro ? "text-alerta" : "text-muted"}`}>{mensagem.texto}</p>}
    </form>
  );
}
