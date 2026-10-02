"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { normalizarBusca } from "@/lib/financeiro/formato";
import { botaoPrimario, campo, rotulo } from "./estilos";

type Variante = { id: string; title: string };

// Monta a composicao de uma variante e aplica nas parecidas de uma vez (ex:
// copiar o A5 Argolado pra todas com "A5" no nome), em vez de repetir a
// mesma ficha em dezenas de variantes.
export function CopiarComposicao({ produtoId, variantes }: { produtoId: string; variantes: Variante[] }) {
  const id = useId();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [origem, setOrigem] = useState(variantes[0]?.id ?? "");
  const [filtro, setFiltro] = useState("");
  const [mensagem, setMensagem] = useState<{ texto: string; erro: boolean } | null>(null);

  const destinos = useMemo(() => {
    const termo = normalizarBusca(filtro.trim());
    return variantes.filter((v) => v.id !== origem && (!termo || normalizarBusca(v.title).includes(termo)));
  }, [variantes, origem, filtro]);

  async function copiar() {
    setMensagem(null);
    const resultado = await enviar(`/api/financeiro/produtos/${produtoId}/copiar`, "POST", {
      origemVarianteId: origem,
      destinoVarianteIds: destinos.map((v) => v.id),
    });
    if (!resultado.ok) {
      setMensagem({ texto: resultado.erro, erro: true });
      return;
    }
    const n = Number(resultado.dados.copiadas);
    setMensagem({ texto: `Composição copiada pra ${n} ${n === 1 ? "variante" : "variantes"}.`, erro: false });
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-3 rounded-2xl border border-dashed border-border p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Copiar composição entre variantes</p>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor={`${id}-origem`} className={rotulo}>
            Copiar de
          </label>
          <select id={`${id}-origem`} value={origem} onChange={(e) => setOrigem(e.target.value)} className={campo}>
            {variantes.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-filtro`} className={rotulo}>
            Para as variantes com no nome (vazio = todas)
          </label>
          <input
            id={`${id}-filtro`}
            type="text"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="ex: Personal"
            className={`${campo} w-44`}
          />
        </div>
        <button type="button" onClick={copiar} disabled={isPending || destinos.length === 0} className={botaoPrimario}>
          {destinos.length === 0
            ? "Nenhuma variante"
            : `Substituir em ${destinos.length} ${destinos.length === 1 ? "variante" : "variantes"}`}
        </button>
      </div>
      {destinos.length > 0 && (
        <p className="text-xs text-muted">
          Vai substituir a composição de: {destinos.map((v) => v.title).join(", ")}.
        </p>
      )}
      {mensagem && (
        <p role="status" className={`text-xs ${mensagem.erro ? "text-alerta" : "text-muted"}`}>
          {mensagem.texto}
        </p>
      )}
    </div>
  );
}
