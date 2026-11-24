"use client";

import Link from "next/link";
import { useState } from "react";
import { chamarApi } from "@/components/marketing/Acoes";
import { botaoPrimario, botaoSecundario, campo } from "@/components/financeiro/estilos";
import type { Previa } from "@/lib/marketing/plano";
import { dataCurta } from "@/lib/marketing/datas";

// "Importar plano": cola ou escolhe o .json que uma conversa do Claude
// montou, ve a previa e so grava com o OK da Lari. Assim nenhum agente
// precisa da senha do banco de producao.

function Lista({ titulo, cor, itens }: { titulo: string; cor: string; itens: React.ReactNode[] }) {
  if (!itens.length) return null;
  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
      <h3 className={`text-sm font-semibold ${cor}`}>
        {titulo} ({itens.length})
      </h3>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-ink">{itens}</ul>
    </section>
  );
}

const EXEMPLO = '{ "lote": 6, "conteudos": [ ... ], "tarefas": [ ... ] }';

export function ImportarPlano() {
  const [texto, setTexto] = useState("");
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [gravado, setGravado] = useState(false);

  async function enviar(gravar: boolean) {
    setMensagem(null);
    let plano: unknown;
    try {
      plano = JSON.parse(texto);
    } catch {
      setMensagem("Esse texto não é um JSON válido. Cole o arquivo inteiro, da primeira à última chave.");
      return;
    }
    setOcupado(true);
    try {
      const r = await chamarApi<{ previa: Previa }>("/api/marketing/importar", { plano, gravar }, "POST");
      setPrevia(r.previa);
      setGravado(gravar);
    } catch (e) {
      setMensagem((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  const p = previa;
  const total = p
    ? p.lotes.novos.length +
      p.lotes.mudados.length +
      p.conteudos.novos.length +
      p.conteudos.mudados.length +
      p.conteudos.arquivar.length +
      p.conteudos.desarquivar.length +
      p.tarefas.novas.length +
      p.tarefas.mudadas.length +
      p.tarefas.arquivar.length
    : 0;
  const item = (c: { codigo: string; data: string; titulo: string }, extra?: string) => (
    <li key={c.codigo}>
      <span className="text-muted tabular-nums">{dataCurta(c.data)}</span> · {c.titulo}
      {extra && <span className="text-xs text-muted"> ({extra})</span>}
    </li>
  );

  if (gravado && p) {
    return (
      <section className="flex flex-col gap-3 rounded-2xl border border-ok/40 bg-ok-soft p-4">
        <p className="text-sm font-semibold text-ok">Plano gravado ✓</p>
        <p className="text-sm text-ink">
          {p.conteudos.novos.length} posts novos, {p.conteudos.mudados.length} alterados, {p.conteudos.arquivar.length} arquivados e{" "}
          {p.tarefas.novas.length} tarefas novas.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/marketing/calendario" className={botaoPrimario}>
            Ver no calendário
          </Link>
          <button
            type="button"
            onClick={() => {
              setTexto("");
              setPrevia(null);
              setGravado(false);
            }}
            className={botaoSecundario}
          >
            Importar outro
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">Arquivo do plano (.json)</span>
        <input
          type="file"
          accept="application/json,.json"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setTexto(await f.text());
            setPrevia(null);
          }}
          className="text-sm"
        />
      </label>
      <textarea
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setPrevia(null);
        }}
        rows={10}
        placeholder={EXEMPLO}
        className={`${campo} font-mono text-xs`}
        aria-label="Texto do plano"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={ocupado || !texto.trim()} onClick={() => enviar(false)} className={botaoSecundario}>
          {ocupado && !p ? "Lendo…" : "Ver prévia"}
        </button>
        {p && !p.erros.length && total > 0 && (
          <button type="button" disabled={ocupado} onClick={() => enviar(true)} className={botaoPrimario}>
            {ocupado ? "Gravando…" : "Aprovar e gravar"}
          </button>
        )}
        {mensagem && <span className="text-xs text-alerta">{mensagem}</span>}
      </div>

      {p && (
        <div className="flex flex-col gap-3">
          {!p.erros.length && total === 0 && <p className="text-sm text-muted">Nada a mudar: o calendário já está igual a esse plano.</p>}
          <Lista titulo="Erros (corrija o plano antes de gravar)" cor="text-alerta" itens={p.erros.map((e) => <li key={e}>{e}</li>)} />
          <Lista titulo="Lotes novos ou alterados" cor="text-ink" itens={[...p.lotes.novos, ...p.lotes.mudados].map((l) => <li key={l}>{l}</li>)} />
          <Lista titulo="Posts novos" cor="text-ok" itens={p.conteudos.novos.map((c) => item(c))} />
          <Lista titulo="Posts alterados" cor="text-azul" itens={p.conteudos.mudados.map((c) => item(c, c.campos.join(", ")))} />
          <Lista titulo="Posts que vão ser arquivados" cor="text-alerta" itens={p.conteudos.arquivar.map((c) => item(c))} />
          <Lista titulo="Posts que voltam do arquivo" cor="text-ink" itens={p.conteudos.desarquivar.map((c) => item(c))} />
          <Lista titulo="Tarefas novas" cor="text-ok" itens={p.tarefas.novas.map((t) => <li key={t}>{t}</li>)} />
          <Lista titulo="Tarefas alteradas" cor="text-azul" itens={p.tarefas.mudadas.map((t) => <li key={t}>{t}</li>)} />
          <Lista titulo="Tarefas que vão ser arquivadas" cor="text-alerta" itens={p.tarefas.arquivar.map((t) => <li key={t}>{t}</li>)} />
        </div>
      )}
    </div>
  );
}
