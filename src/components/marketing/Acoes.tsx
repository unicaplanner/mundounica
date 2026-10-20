"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MktStatus } from "@prisma/client";
import { botaoPrimario, botaoSecundario, campo } from "@/components/financeiro/estilos";

async function enviar(url: string, corpo: unknown) {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => null);
    throw new Error(j?.erro ?? "Não deu certo. Tente de novo.");
  }
}

function useAcao() {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function rodar(url: string, corpo: unknown) {
    setOcupado(true);
    setMensagem(null);
    try {
      await enviar(url, corpo);
      startTransition(() => router.refresh());
      return true;
    } catch (e) {
      setMensagem((e as Error).message);
      return false;
    } finally {
      setOcupado(false);
    }
  }
  return { ocupado, mensagem, rodar };
}

// Botoes da ficha do conteudo, de acordo com o status atual.
export function AcoesConteudo({ id, status, compacto = false }: { id: string; status: MktStatus; compacto?: boolean }) {
  const { ocupado, mensagem, rodar } = useAcao();
  const [modo, setModo] = useState<"nada" | "ajuste" | "publicar">("nada");
  const [texto, setTexto] = useState("");
  const url = `/api/marketing/conteudos/${id}`;

  async function acao(corpo: Record<string, unknown>) {
    if (await rodar(url, corpo)) {
      setModo("nada");
      setTexto("");
    }
  }

  const voltar =
    status !== "roteiro" && !compacto ? (
      <button type="button" disabled={ocupado} onClick={() => acao({ acao: "voltar" })} className="text-xs text-muted underline">
        Desfazer último passo
      </button>
    ) : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {(status === "roteiro" || status === "ajustar") && (
          <>
            <button type="button" disabled={ocupado} onClick={() => acao({ acao: "aprovar" })} className={botaoPrimario}>
              Aprovar roteiro
            </button>
            {!compacto && (
              <button type="button" disabled={ocupado} onClick={() => setModo("ajuste")} className={botaoSecundario}>
                Pedir ajuste
              </button>
            )}
          </>
        )}
        {status === "aprovado" && (
          <button type="button" disabled={ocupado} onClick={() => acao({ acao: "produzido" })} className={botaoPrimario}>
            Já gravei / fotografei
          </button>
        )}
        {(status === "aprovado" || status === "gravado") && (
          <button
            type="button"
            disabled={ocupado}
            onClick={() => (compacto ? acao({ acao: "publicado" }) : setModo("publicar"))}
            className={status === "gravado" ? botaoPrimario : botaoSecundario}
          >
            Postei
          </button>
        )}
        {voltar}
      </div>

      {modo === "ajuste" && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            acao({ acao: "ajustar", nota: texto });
          }}
        >
          <label className="text-xs text-muted" htmlFor={`ajuste-${id}`}>
            O que você quer mudar? (eu leio e reescrevo)
          </label>
          <textarea id={`ajuste-${id}`} value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} className={campo} />
          <div className="flex gap-2">
            <button type="submit" disabled={ocupado} className={botaoPrimario}>
              Enviar ajuste
            </button>
            <button type="button" onClick={() => setModo("nada")} className={botaoSecundario}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {modo === "publicar" && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            acao({ acao: "publicado", link: texto });
          }}
        >
          <label className="text-xs text-muted" htmlFor={`link-${id}`}>
            Link do post (opcional)
          </label>
          <input id={`link-${id}`} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="https://" className={campo} />
          <div className="flex gap-2">
            <button type="submit" disabled={ocupado} className={botaoPrimario}>
              Marcar como publicado
            </button>
            <button type="button" onClick={() => setModo("nada")} className={botaoSecundario}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {mensagem && <p className="text-xs text-alerta">{mensagem}</p>}
    </div>
  );
}

export function TarefaFeita({ id, feita }: { id: string; feita: boolean }) {
  const { ocupado, mensagem, rodar } = useAcao();
  return (
    <span className="flex flex-col">
      <input
        type="checkbox"
        checked={feita}
        disabled={ocupado}
        onChange={(e) => rodar(`/api/marketing/tarefas/${id}`, { feita: e.target.checked })}
        aria-label="Marcar como feita"
        className="mt-0.5 h-5 w-5 accent-[var(--ink)]"
      />
      {mensagem && <span className="text-xs text-alerta">{mensagem}</span>}
    </span>
  );
}

export function PastaDrive({ loteId, url }: { loteId: string; url: string | null }) {
  const { ocupado, mensagem, rodar } = useAcao();
  const [editando, setEditando] = useState(!url);
  const [texto, setTexto] = useState(url ?? "");

  if (!editando && url) {
    return (
      <span className="flex flex-wrap items-center gap-3 text-sm">
        <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-ink underline">
          Abrir a pasta do Drive deste lote ↗
        </a>
        <button type="button" onClick={() => setEditando(true)} className="text-xs text-muted underline">
          trocar link
        </button>
      </span>
    );
  }

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await rodar(`/api/marketing/lotes/${loteId}`, { pastaDriveUrl: texto })) setEditando(false);
      }}
    >
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Cole aqui o link da pasta do Google Drive"
        aria-label="Link da pasta do Google Drive"
        className={`${campo} sm:w-96`}
      />
      <button type="submit" disabled={ocupado} className={botaoPrimario}>
        Salvar pasta
      </button>
      {mensagem && <span className="text-xs text-alerta">{mensagem}</span>}
    </form>
  );
}

export function CopiarTexto({ texto, rotulo = "Copiar" }: { texto: string; rotulo?: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 1500);
        } catch {
          setCopiado(false);
        }
      }}
      className={botaoSecundario}
    >
      {copiado ? "Copiado ✓" : rotulo}
    </button>
  );
}
