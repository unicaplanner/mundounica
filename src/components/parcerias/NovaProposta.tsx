"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { botaoPrimario, campo, rotulo } from "@/components/financeiro/estilos";

const hoje = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

// Cola a DM recebida; o @ e o que ela pede sao tirados do texto.
export function NovaProposta() {
  const id = useId();
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [instagram, setInstagram] = useState("");
  const [recebidaEm, setRecebidaEm] = useState(hoje);
  const [salvando, setSalvando] = useState(false);
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErroMsg(null);
    setSalvando(true);
    const r = await enviar("/api/parcerias/propostas", "POST", { texto, instagram, recebidaEm });
    setSalvando(false);
    if (!r.ok) {
      setErroMsg(r.erro);
      return;
    }
    router.push(`/marketing/parcerias/propostas/${r.dados.id}`);
  }

  return (
    <form onSubmit={salvar} className="space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-ink">Nova proposta</h3>
      <div>
        <label htmlFor={`${id}-texto`} className={rotulo}>
          Cole a DM inteira
        </label>
        <textarea id={`${id}-texto`} rows={6} value={texto} onChange={(e) => setTexto(e.target.value)} className={`${campo} w-full`} />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor={`${id}-insta`} className={rotulo}>
            @ dela (se não estiver no texto)
          </label>
          <input id={`${id}-insta`} autoCapitalize="none" value={instagram} onChange={(e) => setInstagram(e.target.value)} className={`${campo} w-48`} />
        </div>
        <div>
          <label htmlFor={`${id}-data`} className={rotulo}>
            Recebida em
          </label>
          <input id={`${id}-data`} type="date" value={recebidaEm} onChange={(e) => setRecebidaEm(e.target.value)} className={campo} />
        </div>
        <button type="submit" disabled={salvando || texto.trim().length < 10} className={botaoPrimario}>
          {salvando ? "Salvando..." : "Salvar e avaliar"}
        </button>
      </div>
      {erroMsg && <p className="text-xs text-alerta">{erroMsg}</p>}
    </form>
  );
}
