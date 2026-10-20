"use client";

import Link from "next/link";
import { useState } from "react";
import { preencherMensagem } from "@/lib/parcerias/mensagens";
import { campo } from "@/components/financeiro/estilos";
import { Copiar } from "./Copiar";

// DM com o nome, o gancho e o cupom dela, a partir dos modelos de mensagem.
export function DmPronta({
  modelos,
  criadora,
}: {
  modelos: { id: string; titulo: string; texto: string }[];
  criadora: { nome: string | null; gancho: string | null; cupom: string | null; instagram: string | null };
}) {
  const [modeloId, setModeloId] = useState(modelos[0]?.id ?? "");
  if (modelos.length === 0) {
    return (
      <p className="text-sm text-muted">
        Nenhum modelo de mensagem ainda. <Link href="/marketing/parcerias/mensagens" className="underline">Criar modelos</Link>
      </p>
    );
  }
  const modelo = modelos.find((m) => m.id === modeloId) ?? modelos[0];
  const texto = preencherMensagem(modelo.texto, criadora);
  const faltando = [
    modelo.texto.includes("{nome}") && !criadora.nome && "nome",
    modelo.texto.includes("{gancho}") && !criadora.gancho && "gancho",
    modelo.texto.includes("{cupom}") && !criadora.cupom && "cupom",
  ].filter(Boolean);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Modelo de mensagem" value={modelo.id} onChange={(e) => setModeloId(e.target.value)} className={campo}>
          {modelos.map((m) => (
            <option key={m.id} value={m.id}>
              {m.titulo}
            </option>
          ))}
        </select>
        <Copiar texto={texto} rotulo="Copiar DM" />
        {criadora.instagram && (
          <a href={`https://ig.me/m/${criadora.instagram}`} target="_blank" rel="noopener noreferrer" className="text-xs text-ink underline">
            abrir conversa no Instagram ↗
          </a>
        )}
      </div>
      {faltando.length > 0 && <p className="text-xs text-atencao">Falta preencher na ficha: {faltando.join(", ")}.</p>}
      <textarea readOnly value={texto} rows={Math.min(14, texto.split("\n").length + 2)} aria-label="DM pronta" className={`${campo} w-full leading-relaxed`} />
    </div>
  );
}
