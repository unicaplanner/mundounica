"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { botaoPrimario, botaoSecundario, campo } from "@/components/financeiro/estilos";

// Resposta do formulario que nao bateu com nenhum @: escolher a criadora ou
// criar a ficha a partir dela.
export function LigarResposta({ respostaId, criadoras }: { respostaId: string; criadoras: { id: string; nome: string }[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [criadoraId, setCriadoraId] = useState("");
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  async function ligar(body: Record<string, unknown>) {
    setErroMsg(null);
    const r = await enviar(`/api/parcerias/respostas/${respostaId}`, "PATCH", body);
    if (!r.ok) {
      setErroMsg(r.erro);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select aria-label="Criadora" value={criadoraId} onChange={(e) => setCriadoraId(e.target.value)} className={`${campo} max-w-60`}>
        <option value="">Escolha a criadora...</option>
        {criadoras.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </select>
      <button type="button" disabled={!criadoraId || isPending} onClick={() => ligar({ criadoraId })} className={botaoPrimario}>
        Ligar
      </button>
      <button type="button" disabled={isPending} onClick={() => ligar({ criar: true })} className={botaoSecundario}>
        Criar ficha nova
      </button>
      {erroMsg && <span className="text-xs text-alerta">{erroMsg}</span>}
    </div>
  );
}
