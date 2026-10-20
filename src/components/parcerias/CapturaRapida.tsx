"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { campo, rotulo } from "@/components/financeiro/estilos";

type Salva = { id: string; existente: boolean; link: string };

// Captura relampago: cola o link e pronto. Vindo do Atalho do iPhone
// (/marketing/parcerias/nova?link=...), salva sozinho ao abrir.
export function CapturaRapida({ linkInicial }: { linkInicial: string }) {
  const [link, setLink] = useState(linkInicial);
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [salvas, setSalvas] = useState<Salva[]>([]);
  const [erroMsg, setErroMsg] = useState<string | null>(null);
  const campoLink = useRef<HTMLInputElement>(null);
  const jaEnviouInicial = useRef(false);

  async function salvar(valor: string, nota: string) {
    if (!valor.trim()) return;
    setErroMsg(null);
    setSalvando(true);
    const r = await enviar("/api/parcerias/criadoras", "POST", { link: valor, motivo: nota });
    setSalvando(false);
    if (!r.ok) {
      setErroMsg(r.erro);
      return;
    }
    setSalvas((s) => [{ id: String(r.dados.id), existente: Boolean(r.dados.existente), link: valor.trim() }, ...s]);
    setLink("");
    setMotivo("");
    campoLink.current?.focus();
  }

  useEffect(() => {
    if (linkInicial && !jaEnviouInicial.current) {
      jaEnviouInicial.current = true;
      void salvar(linkInicial, "");
    }
    // so na abertura
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-xl space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void salvar(link, motivo);
        }}
        className="space-y-3 rounded-2xl border border-border bg-card p-5"
      >
        <div>
          <label htmlFor="captura-link" className={rotulo}>
            Link do perfil (Instagram, TikTok ou YouTube) ou o @
          </label>
          <input
            id="captura-link"
            ref={campoLink}
            autoFocus
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="https://instagram.com/..."
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className={`${campo} w-full py-2.5 text-base`}
          />
        </div>
        <div>
          <label htmlFor="captura-motivo" className={rotulo}>
            Por que chamou atenção? (opcional, dá pra fazer depois na triagem)
          </label>
          <input id="captura-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} className={`${campo} w-full`} />
        </div>
        <button type="submit" disabled={salvando || !link.trim()} className="w-full rounded-full bg-ink py-2.5 text-sm font-semibold text-background disabled:opacity-50">
          {salvando ? "Salvando..." : "Salvar"}
        </button>
        {erroMsg && <p className="text-sm text-alerta">{erroMsg}</p>}
      </form>

      {salvas.length > 0 && (
        <ul className="space-y-2">
          {salvas.map((s, i) => (
            <li key={`${s.id}-${i}`} className={`rounded-xl px-4 py-3 text-sm ${s.existente ? "bg-atencao-soft text-atencao" : "bg-ok-soft text-ok"}`}>
              {s.existente ? "Ela já estava na sua lista: " : "Salva ✓ "}
              <Link href={`/marketing/parcerias/criadoras/${s.id}`} className="font-semibold underline">
                abrir ficha
              </Link>
              <span className="mt-0.5 block truncate text-xs opacity-80">{s.link}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
