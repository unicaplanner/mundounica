"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { normalizarNumero, paraCampo } from "@/lib/financeiro/formato";
import { botaoPrimario, campo } from "./estilos";

const CAMPOS = [
  { chave: "margemProducao", rotulo: "Produção própria" },
  { chave: "margemKit", rotulo: "Kit" },
  { chave: "margemRevenda", rotulo: "Revenda" },
] as const;

// Edita as metas de margem de contribuicao por tipo de produto.
export function MetasMargem({
  margemProducao,
  margemKit,
  margemRevenda,
}: {
  margemProducao: number;
  margemKit: number;
  margemRevenda: number;
}) {
  const id = useId();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [valores, setValores] = useState({
    margemProducao: paraCampo(margemProducao),
    margemKit: paraCampo(margemKit),
    margemRevenda: paraCampo(margemRevenda),
  });
  const [mensagem, setMensagem] = useState<{ texto: string; erro: boolean } | null>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setMensagem(null);
    const resultado = await enviar("/api/financeiro/configuracao", "PATCH", {
      margemProducao: normalizarNumero(valores.margemProducao),
      margemKit: normalizarNumero(valores.margemKit),
      margemRevenda: normalizarNumero(valores.margemRevenda),
    });
    if (!resultado.ok) {
      setMensagem({ texto: resultado.erro, erro: true });
      return;
    }
    setMensagem({ texto: "Metas salvas.", erro: false });
    startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={salvar} className="flex flex-wrap items-end gap-3">
      {CAMPOS.map((c) => (
        <div key={c.chave}>
          <label htmlFor={`${id}-${c.chave}`} className="mb-1 block text-xs text-background/70">
            {c.rotulo} (%)
          </label>
          <input
            id={`${id}-${c.chave}`}
            type="text"
            inputMode="decimal"
            value={valores[c.chave]}
            onChange={(e) => setValores({ ...valores, [c.chave]: e.target.value })}
            className={`${campo} w-20`}
          />
        </div>
      ))}
      <button type="submit" disabled={isPending} className={`${botaoPrimario} bg-background text-ink`}>
        Salvar metas
      </button>
      {mensagem && (
        <p role="status" className={`w-full text-xs ${mensagem.erro ? "text-accent" : "text-background/70"}`}>
          {mensagem.texto}
        </p>
      )}
    </form>
  );
}
