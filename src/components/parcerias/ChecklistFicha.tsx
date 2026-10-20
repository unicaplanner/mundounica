"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { ETAPAS } from "@/lib/parcerias/etapas";
import { IconeLixeira, botaoIcone } from "@/components/financeiro/Icones";
import { botaoPrimario, campo, rotulo } from "@/components/financeiro/estilos";
import { BotaoAcao } from "@/components/parcerias/BotaoAcao";
import { ItemProducao } from "@/components/parcerias/ItemProducao";

type Item = { id: string; etapa: string; texto: string; feito: boolean };

const rotuloDaEtapa = Object.fromEntries(ETAPAS.map((e) => [e.valor, e.rotulo])) as Record<string, string>;

// Checklist de producao dentro da ficha da criadora: o que preparar pro envio
// dela, na ordem de fazer. Itens avulsos entram pelo formulario de baixo.
export function ChecklistFicha({ criadoraId, itens }: { criadoraId: string; itens: Item[] }) {
  const id = useId();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [etapa, setEtapa] = useState<string>("outro");
  const [texto, setTexto] = useState("");
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  async function chamar(url: string, method: "POST" | "DELETE", body?: unknown) {
    setErroMsg(null);
    const r = await enviar(url, method, body);
    if (!r.ok) {
      setErroMsg(r.erro);
      return false;
    }
    startTransition(() => router.refresh());
    return true;
  }

  const feitos = itens.filter((i) => i.feito).length;

  return (
    <div className="space-y-3">
      {itens.length === 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-muted">Ainda sem lista. Crio a partir do kit dela: cupom, case, blocos, cartão, caixa e despacho.</p>
          <BotaoAcao url="/api/parcerias/producao" body={{ acao: "gerar", criadoraId }} rotulo="Criar a lista de produção" rotuloAndamento="Criando..." />
        </div>
      ) : (
        <>
          <p className="text-xs tabular-nums text-muted">
            {feitos} de {itens.length} feitos
          </p>
          <ul className="divide-y divide-border-soft">
            {itens.map((i) => (
              <li key={i.id} className="flex items-start justify-between gap-2">
                <ItemProducao id={i.id} feito={i.feito}>
                  <span className="mr-2 text-[11px] font-semibold uppercase tracking-wide text-muted">{rotuloDaEtapa[i.etapa] ?? i.etapa}</span>
                  <span className="block">{i.texto}</span>
                </ItemProducao>
                <button
                  type="button"
                  onClick={() => chamar(`/api/parcerias/producao/${i.id}`, "DELETE")}
                  aria-label="Tirar da lista"
                  title="Tirar da lista"
                  className={`${botaoIcone} mt-1`}
                >
                  <IconeLixeira />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await chamar("/api/parcerias/producao", "POST", { criadoraId, etapa, texto })) setTexto("");
        }}
      >
        <div>
          <label htmlFor={`${id}-etapa`} className={rotulo}>
            Acrescentar item
          </label>
          <select id={`${id}-etapa`} value={etapa} onChange={(e) => setEtapa(e.target.value)} className={campo}>
            {ETAPAS.map((e) => (
              <option key={e.valor} value={e.valor}>
                {e.rotulo}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0 flex-1 basis-56">
          <label htmlFor={`${id}-texto`} className="sr-only">
            O que fazer
          </label>
          <input
            id={`${id}-texto`}
            placeholder="Ex: trocar o vertical por bloco pautado"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className={`${campo} w-full`}
          />
        </div>
        <button type="submit" disabled={isPending || !texto.trim()} className={botaoPrimario}>
          Adicionar
        </button>
      </form>
      {erroMsg && <p className="text-xs text-alerta">{erroMsg}</p>}
    </div>
  );
}
