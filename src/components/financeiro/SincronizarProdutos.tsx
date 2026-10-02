"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { botaoSecundario } from "./estilos";

export function SincronizarProdutos() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState<{ texto: string; erro: boolean } | null>(null);
  const [, startTransition] = useTransition();

  async function sincronizar() {
    setCarregando(true);
    setMensagem(null);
    const resultado = await enviar("/api/financeiro/sync", "POST");
    setCarregando(false);
    if (!resultado.ok) {
      setMensagem({ texto: resultado.erro, erro: true });
      return;
    }
    setMensagem({
      texto: `${resultado.dados.produtos} produtos e ${resultado.dados.variantes} variantes atualizados.`,
      erro: false,
    });
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={sincronizar} disabled={carregando} className={botaoSecundario}>
        {carregando ? "Sincronizando..." : "Sincronizar produtos do Shopify"}
      </button>
      {mensagem && (
        <span role="status" className={`text-xs ${mensagem.erro ? "text-alerta" : "text-muted"}`}>
          {mensagem.texto}
        </span>
      )}
    </div>
  );
}
