"use client";

import type { Recomendacao } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { CRITERIOS, ROTULO_RESPOSTA, sugerir, type Checklist, type Resposta } from "@/lib/parcerias/avaliacao";
import { COR_RECOMENDACAO, ROTULO_RECOMENDACAO } from "@/lib/parcerias/rotulos";
import { botaoPrimario, botaoSecundario, campo, rotulo } from "@/components/financeiro/estilos";

// Checklist dos criterios da marca -> sugestao -> decisao da Lari.
export function AvaliacaoProposta({
  propostaId,
  checklistInicial,
  justificativaInicial,
  perguntasInicial,
  pedidoInicial,
  valorInicial,
  recomendacao,
  sugestaoClaude,
  claudeLigado,
}: {
  propostaId: string;
  checklistInicial: Checklist;
  justificativaInicial: string;
  perguntasInicial: string;
  pedidoInicial: string;
  valorInicial: string;
  recomendacao: Recomendacao | null;
  sugestaoClaude: Recomendacao | null;
  claudeLigado: boolean;
}) {
  const id = useId();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [checklist, setChecklist] = useState<Checklist>(checklistInicial);
  const [justificativa, setJustificativa] = useState(justificativaInicial);
  const [perguntas, setPerguntas] = useState(perguntasInicial);
  const [pedido, setPedido] = useState(pedidoInicial);
  const [valor, setValor] = useState(valorInicial);
  const [analisando, setAnalisando] = useState(false);
  const [erroMsg, setErroMsg] = useState<string | null>(null);
  const url = `/api/parcerias/propostas/${propostaId}`;
  const sugestao = sugerir(checklist);

  async function salvar(extra: Record<string, unknown> = {}) {
    setErroMsg(null);
    const r = await enviar(url, "PATCH", { checklist, justificativa, perguntas, pedido, valorPedido: valor, ...extra });
    if (!r.ok) {
      setErroMsg(r.erro);
      return;
    }
    startTransition(() => router.refresh());
  }

  async function analisar() {
    setErroMsg(null);
    setAnalisando(true);
    const r = await enviar(`${url}/claude`, "POST");
    setAnalisando(false);
    if (!r.ok) {
      setErroMsg(r.erro);
      return;
    }
    // recarrega a pagina inteira pra pegar o checklist do Claude nos campos
    window.location.reload();
  }

  function decidir(r: Recomendacao) {
    if (!justificativa.trim()) {
      const motivo = r === sugestao.recomendacao ? sugestao.motivos.join("; ") : "";
      setJustificativa(motivo);
      void salvar({ recomendacao: r, justificativa: motivo });
      return;
    }
    void salvar({ recomendacao: r });
  }

  return (
    <div className="space-y-5">
      {claudeLigado ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-accent-soft/60 px-4 py-3">
          <button type="button" onClick={analisar} disabled={analisando} className={botaoPrimario}>
            {analisando ? "O Claude está lendo..." : sugestaoClaude ? "Analisar de novo com o Claude" : "Analisar com o Claude"}
          </button>
          <span className="text-xs text-muted">Ele preenche o checklist, a justificativa e o que falta você conferir. A decisão continua sua.</span>
        </div>
      ) : (
        <p className="rounded-xl bg-accent-soft/60 px-4 py-3 text-xs text-muted">
          Avaliação manual. Quando a chave da API do Claude (ANTHROPIC_API_KEY) for colocada na Vercel, aparece aqui o botão &quot;Analisar com o Claude&quot;.
        </p>
      )}
      {sugestaoClaude && (
        <p className="text-sm">
          Sugestão do Claude:{" "}
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${COR_RECOMENDACAO[sugestaoClaude]}`}>{ROTULO_RECOMENDACAO[sugestaoClaude]}</span>
        </p>
      )}

      <fieldset className="space-y-4">
        <legend className="mb-2 text-sm font-semibold text-ink">Critérios da marca</legend>
        {CRITERIOS.map((c) => (
          <div key={c.chave} className="space-y-1.5">
            <p className="text-sm text-ink">
              {c.pergunta}
              {c.eliminatorio && <span className="ml-1 text-xs text-muted">(eliminatório)</span>}
            </p>
            <p className="text-xs text-muted">{c.dica}</p>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={c.pergunta}>
              {c.opcoes.map((o) => {
                const marcado = checklist[c.chave] === o;
                return (
                  <button
                    key={o}
                    type="button"
                    role="radio"
                    aria-checked={marcado}
                    onClick={() => setChecklist({ ...checklist, [c.chave]: marcado ? undefined : (o as Resposta) })}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      marcado
                        ? o === "sim"
                          ? "bg-ok text-white"
                          : o === "nao"
                            ? "bg-alerta text-white"
                            : "bg-atencao text-white"
                        : "border border-border text-muted hover:text-ink"
                    }`}
                  >
                    {ROTULO_RESPOSTA[o]}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </fieldset>

      <div className="flex flex-wrap gap-3">
        <div>
          <label htmlFor={`${id}-pedido`} className={rotulo}>
            O que ela pede
          </label>
          <select id={`${id}-pedido`} value={pedido} onChange={(e) => setPedido(e.target.value)} className={campo}>
            <option value="">Não disse</option>
            <option value="permuta">Permuta / produto</option>
            <option value="pago">Pagamento (cachê)</option>
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-valor`} className={rotulo}>
            Valor pedido (R$)
          </label>
          <input id={`${id}-valor`} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} className={`${campo} w-32`} />
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-border-soft p-4">
        <p className="text-sm text-ink">
          Sugestão pelo checklist:{" "}
          {sugestao.recomendacao ? (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${COR_RECOMENDACAO[sugestao.recomendacao]}`}>
              {ROTULO_RECOMENDACAO[sugestao.recomendacao]}
            </span>
          ) : (
            <span className="text-muted">responda os critérios</span>
          )}
        </p>
        {sugestao.motivos.length > 0 && (
          <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted">
            {sugestao.motivos.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label htmlFor={`${id}-just`} className={rotulo}>
          Justificativa (curta)
        </label>
        <textarea id={`${id}-just`} rows={3} value={justificativa} onChange={(e) => setJustificativa(e.target.value)} className={`${campo} w-full`} />
      </div>
      <div>
        <label htmlFor={`${id}-perg`} className={rotulo}>
          O que falta conferir ou perguntar a ela (uma por linha)
        </label>
        <textarea id={`${id}-perg`} rows={3} value={perguntas} onChange={(e) => setPerguntas(e.target.value)} className={`${campo} w-full`} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => salvar()} disabled={isPending} className={botaoSecundario}>
          Salvar rascunho
        </button>
        <span className="mx-1 text-xs text-muted">Decidir:</span>
        {(["aprovar", "investigar", "recusar"] as const).map((r) => (
          <button
            key={r}
            type="button"
            disabled={isPending}
            onClick={() => decidir(r)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${COR_RECOMENDACAO[r]} ${recomendacao === r ? "ring-2 ring-ink" : ""} disabled:opacity-50`}
          >
            {ROTULO_RECOMENDACAO[r]}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">Aprovar move a criadora pra &quot;Em negociação&quot;; recusar, pra &quot;Não seguiu&quot;.</p>
      {erroMsg && <p className="text-sm text-alerta">{erroMsg}</p>}
    </div>
  );
}
