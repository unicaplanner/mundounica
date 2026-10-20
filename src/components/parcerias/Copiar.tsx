"use client";

import { useState } from "react";
import { botaoSecundario } from "@/components/financeiro/estilos";

// Copia um texto (DM pronta, codigo do script). Se o navegador bloquear,
// avisa pra selecionar na mao.
export function Copiar({ texto, rotulo = "Copiar", className = botaoSecundario }: { texto: string; rotulo?: string; className?: string }) {
  const [estado, setEstado] = useState<"" | "ok" | "falhou">("");

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setEstado("ok");
    } catch {
      setEstado("falhou");
    }
    setTimeout(() => setEstado(""), 2500);
  }

  return (
    <button type="button" onClick={copiar} className={className}>
      {estado === "ok" ? "Copiado ✓" : estado === "falhou" ? "Selecione e use Ctrl+C" : rotulo}
    </button>
  );
}
