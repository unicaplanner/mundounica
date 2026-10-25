"use client";

import { useState } from "react";
import { PERGUNTAS, PROPOSTAS, type Pergunta, type PropostaId } from "@/lib/quiz/propostas";

type Resposta = PropostaId | "nenhuma";

// Uma pergunta por vez; no fim, conta quantas escolhas bateram com cada
// proposta. "Nenhuma / nao sei" nao entra na conta.
export function QuizPropostas() {
  const [respostas, setRespostas] = useState<Record<string, Resposta>>({});
  const [indice, setIndice] = useState(0);
  // Veio do resultado pelo "Mudar resposta": responde e volta pro resultado.
  const [revisando, setRevisando] = useState(false);

  const terminou = indice >= PERGUNTAS.length;

  function responder(resposta: Resposta) {
    const pergunta = PERGUNTAS[indice];
    setRespostas((r) => ({ ...r, [pergunta.id]: resposta }));
    if (revisando) {
      setRevisando(false);
      setIndice(PERGUNTAS.length);
    } else {
      setIndice((i) => i + 1);
    }
  }

  function revisar(i: number) {
    setRevisando(true);
    setIndice(i);
  }

  function recomecar() {
    setRespostas({});
    setIndice(0);
    setRevisando(false);
  }

  if (terminou) {
    return <Resultado respostas={respostas} onRecomecar={recomecar} onRevisar={revisar} />;
  }

  const pergunta = PERGUNTAS[indice];
  const ordem: PropostaId[] = pergunta.plPrimeiro ? ["pl", "pt"] : ["pt", "pl"];
  const escolhida = respostas[pergunta.id];

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-muted">
          <span className="font-semibold uppercase tracking-wide">{pergunta.area}</span>
          <span>
            {indice + 1} de {PERGUNTAS.length}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-accent-soft">
          <div
            className="h-full rounded-full bg-accent-ink transition-all"
            style={{ width: `${(indice / PERGUNTAS.length) * 100}%` }}
          />
        </div>
      </div>

      <h2 className="font-serif text-2xl font-semibold text-ink">{pergunta.pergunta}</h2>

      <div className="space-y-3">
        {ordem.map((id, i) => (
          <button
            key={id}
            type="button"
            onClick={() => responder(id)}
            className={`flex w-full gap-3 rounded-2xl border p-5 text-left text-sm leading-relaxed transition hover:border-accent-ink ${
              escolhida === id ? "border-accent-ink bg-accent-soft" : "border-border bg-card"
            }`}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent font-serif font-semibold text-accent-ink">
              {i === 0 ? "A" : "B"}
            </span>
            <span className="text-ink">{pergunta[id]}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => responder("nenhuma")}
          className={`w-full rounded-2xl border border-dashed px-5 py-3 text-left text-sm transition hover:border-accent-ink ${
            escolhida === "nenhuma" ? "border-accent-ink bg-accent-soft" : "border-border"
          } text-muted`}
        >
          Nenhuma das duas / não tenho opinião
        </button>
      </div>

      {indice > 0 && !revisando && (
        <button
          type="button"
          onClick={() => setIndice((i) => i - 1)}
          className="text-sm font-semibold text-muted hover:text-ink"
        >
          ← Voltar
        </button>
      )}
    </div>
  );
}

function Resultado({
  respostas,
  onRecomecar,
  onRevisar,
}: {
  respostas: Record<string, Resposta>;
  onRecomecar: () => void;
  onRevisar: (indice: number) => void;
}) {
  const votos = { pt: 0, pl: 0 };
  for (const r of Object.values(respostas)) {
    if (r !== "nenhuma") votos[r] += 1;
  }
  const total = votos.pt + votos.pl;

  if (total === 0) {
    return (
      <div className="space-y-4">
        <h2 className="font-serif text-2xl font-semibold text-ink">Sem resultado</h2>
        <p className="text-sm text-muted">
          Você marcou &quot;nenhuma das duas&quot; em todas as perguntas, então não dá para dizer qual
          proposta está mais perto das suas opiniões.
        </p>
        <BotaoRecomecar onClick={onRecomecar} />
      </div>
    );
  }

  const pct = { pt: Math.round((votos.pt / total) * 100), pl: 0 };
  pct.pl = 100 - pct.pt;
  const vencedora: PropostaId | null = votos.pt === votos.pl ? null : votos.pt > votos.pl ? "pt" : "pl";

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-ink px-6 py-6 text-background">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Seu resultado</p>
        {vencedora ? (
          <>
            <h2 className="mt-2 font-serif text-2xl font-semibold">
              Suas respostas estão mais alinhadas à proposta do {PROPOSTAS[vencedora].nome} (
              {PROPOSTAS[vencedora].candidato})
            </h2>
            <p className="mt-1 text-sm text-background/70">{PROPOSTAS[vencedora].documento}</p>
          </>
        ) : (
          <h2 className="mt-2 font-serif text-2xl font-semibold">
            Empate: suas respostas se dividiram igualmente entre as duas propostas
          </h2>
        )}

        <div className="mt-6 space-y-3">
          {(["pt", "pl"] as PropostaId[]).map((id) => (
            <div key={id}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-semibold">
                  {PROPOSTAS[id].nome} ({PROPOSTAS[id].candidato})
                </span>
                <span>
                  {pct[id]}% · {votos[id]} de {total}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-background/15">
                <div className="h-full rounded-full bg-accent" style={{ width: `${pct[id]}%` }} />
              </div>
            </div>
          ))}
        </div>
        {total < PERGUNTAS.length && (
          <p className="mt-4 text-xs text-background/60">
            {PERGUNTAS.length - total} resposta(s) &quot;nenhuma das duas&quot; não entraram na conta.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Área por área</h3>
        {PERGUNTAS.map((p, i) => (
          <ItemResultado key={p.id} pergunta={p} resposta={respostas[p.id]} onRevisar={() => onRevisar(i)} />
        ))}
      </section>

      <p className="text-xs leading-relaxed text-muted">
        O quiz resume só o que está escrito nos dois documentos e simplifica temas complexos em duas
        opções. Ele mostra afinidade com as propostas, não é recomendação de voto: vale ler os
        programas completos.
      </p>

      <BotaoRecomecar onClick={onRecomecar} />
    </div>
  );
}

function ItemResultado({
  pergunta,
  resposta,
  onRevisar,
}: {
  pergunta: Pergunta;
  resposta: Resposta | undefined;
  onRevisar: () => void;
}) {
  const selo =
    resposta === "pt" || resposta === "pl"
      ? `Você escolheu a posição do ${PROPOSTAS[resposta].nome}`
      : "Nenhuma das duas";

  return (
    <details className="rounded-2xl border border-border bg-card p-4">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2">
        <span>
          <span className="block text-xs font-semibold uppercase tracking-wide text-muted">{pergunta.area}</span>
          <span className="block text-sm font-semibold text-ink">{pergunta.pergunta}</span>
        </span>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            resposta === "pt"
              ? "bg-rosa-soft text-rosa"
              : resposta === "pl"
                ? "bg-azul-soft text-azul"
                : "bg-accent-soft text-muted"
          }`}
        >
          {selo}
        </span>
      </summary>
      <dl className="mt-3 space-y-3 text-sm leading-relaxed">
        {(["pt", "pl"] as PropostaId[]).map((id) => (
          <div key={id}>
            <dt className="font-semibold text-ink">
              {PROPOSTAS[id].nome} ({PROPOSTAS[id].candidato})
            </dt>
            <dd className="text-ink/80">{pergunta[id]}</dd>
          </div>
        ))}
      </dl>
      <button type="button" onClick={onRevisar} className="mt-3 text-xs font-semibold text-muted hover:text-ink">
        Mudar resposta
      </button>
    </details>
  );
}

function BotaoRecomecar({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={onClick}
        className="rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-background hover:opacity-90"
      >
        Refazer o quiz
      </button>
    </div>
  );
}
