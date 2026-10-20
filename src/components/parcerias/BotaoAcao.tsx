"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { botaoSecundario } from "@/components/financeiro/estilos";

// Botao que chama uma rota e recarrega a tela. Com "confirmar", pede um
// segundo clique (pra excluir). Com "irPara", navega depois de dar certo.
export function BotaoAcao({
  url,
  method = "POST",
  body,
  rotulo,
  rotuloAndamento,
  confirmar,
  irPara,
  className = botaoSecundario,
}: {
  url: string;
  method?: "POST" | "PATCH" | "DELETE";
  body?: unknown;
  rotulo: string;
  rotuloAndamento?: string;
  confirmar?: string;
  irPara?: string;
  className?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rodando, setRodando] = useState(false);
  const [pedindo, setPedindo] = useState(false);
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  async function executar() {
    setPedindo(false);
    setErroMsg(null);
    setRodando(true);
    const r = await enviar(url, method, body);
    setRodando(false);
    if (!r.ok) {
      setErroMsg(r.erro);
      return;
    }
    startTransition(() => {
      if (irPara) router.push(irPara);
      else router.refresh();
    });
  }

  if (pedindo) {
    return (
      <span className="inline-flex flex-wrap items-center gap-2 text-xs">
        <span className="text-alerta">{confirmar}</span>
        <button type="button" onClick={executar} className="font-semibold text-alerta underline">
          Sim
        </button>
        <button type="button" onClick={() => setPedindo(false)} className="text-muted underline">
          Cancelar
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" disabled={rodando || isPending} onClick={() => (confirmar ? setPedindo(true) : executar())} className={className}>
        {rodando || isPending ? (rotuloAndamento ?? "Aguarde...") : rotulo}
      </button>
      {erroMsg && <span className="text-xs text-alerta">{erroMsg}</span>}
    </span>
  );
}
