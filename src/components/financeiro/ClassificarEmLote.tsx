"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { botaoPrimario, campo } from "./estilos";

// Barra pra classificar de uma vez os produtos marcados na lista. As caixas
// de marcar ficam nas linhas da lista (input name="ids" form={formId}); aqui
// so le quais estao marcadas.
export function ClassificarEmLote({ formId }: { formId: string }) {
  const id = useId();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [marcados, setMarcados] = useState(0);
  const [total, setTotal] = useState(0);
  const [tipo, setTipo] = useState("producao_propria");
  const [mensagem, setMensagem] = useState<{ texto: string; erro: boolean } | null>(null);

  const caixas = () => [...document.querySelectorAll<HTMLInputElement>(`input[name="ids"][form="${formId}"]`)];

  useEffect(() => {
    const contar = () => {
      const todas = caixas();
      setTotal(todas.length);
      setMarcados(todas.filter((c) => c.checked).length);
    };
    contar();
    document.addEventListener("change", contar);
    return () => document.removeEventListener("change", contar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId]);

  function marcarTodos(marcar: boolean) {
    caixas().forEach((c) => (c.checked = marcar));
    setMarcados(marcar ? caixas().length : 0);
  }

  async function aplicar() {
    const ids = caixas()
      .filter((c) => c.checked)
      .map((c) => c.value);
    setMensagem(null);
    const resultado = await enviar("/api/financeiro/produtos/classificar", "POST", { ids, tipo });
    if (!resultado.ok) {
      setMensagem({ texto: resultado.erro, erro: true });
      return;
    }
    const atualizados = Number(resultado.dados.atualizados);
    const pulados = (resultado.dados.pulados as string[]) ?? [];
    setMensagem({
      texto:
        `${atualizados} ${atualizados === 1 ? "produto classificado" : "produtos classificados"}.` +
        (pulados.length ? ` Não viraram kit porque estão dentro de outro kit: ${pulados.join(", ")}.` : ""),
      erro: pulados.length > 0,
    });
    marcarTodos(false);
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-accent-soft px-4 py-2.5 text-sm">
      <label className="flex items-center gap-2 text-xs text-ink/80">
        <input
          type="checkbox"
          checked={total > 0 && marcados === total}
          onChange={(e) => marcarTodos(e.target.checked)}
          className="size-4 accent-ink"
        />
        Marcar todos da lista
      </label>
      <span className="text-xs text-muted">
        {marcados === 0 ? "Marque produtos pra classificar vários de uma vez." : `${marcados} marcados`}
      </span>
      {marcados > 0 && (
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <label htmlFor={`${id}-tipo`} className="text-xs text-muted">
            Classificar como
          </label>
          <select id={`${id}-tipo`} value={tipo} onChange={(e) => setTipo(e.target.value)} className={`${campo} text-xs`}>
            <option value="producao_propria">Produção própria</option>
            <option value="revenda">Revenda</option>
            <option value="kit">Kit</option>
            <option value="ignorar">Não contar (brinde)</option>
          </select>
          <button type="button" onClick={aplicar} disabled={isPending} className={`${botaoPrimario} py-1 text-xs`}>
            Aplicar
          </button>
        </div>
      )}
      {mensagem && (
        <p role="status" className={`w-full text-xs ${mensagem.erro ? "text-alerta" : "text-muted"}`}>
          {mensagem.texto}
        </p>
      )}
    </div>
  );
}
