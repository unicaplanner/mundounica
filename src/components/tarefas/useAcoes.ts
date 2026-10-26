"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import type { Chamada, ItemChecklist, StatusTarefa } from "@/lib/tarefas/meta";

export type DadosTarefa = {
  titulo?: string;
  descricao?: string | null;
  categoria?: string;
  tags?: string[];
  status?: StatusTarefa;
  prazo?: string | null;
  link?: string | null;
  checklist?: ItemChecklist[];
};

const json = (method: string, corpo?: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: corpo === undefined ? undefined : JSON.stringify(corpo),
});

// Chamadas de API do organizador + refresh. `ocupados` guarda as chaves em
// voo (id da tarefa, ou "nova") pra desabilitar o controle certo.
export function useAcoes() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [ocupados, setOcupados] = useState<Set<string>>(new Set());
  const [mensagem, setMensagem] = useState<string | null>(null);

  const rodar = useCallback(
    async (chave: string, fazer: () => Promise<Response>) => {
      setOcupados((s) => new Set(s).add(chave));
      setMensagem(null);
      try {
        const res = await fazer();
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          setMensagem(j?.erro ?? "Não deu certo. Tente de novo.");
          return false;
        }
        startTransition(() => router.refresh());
        return true;
      } catch {
        setMensagem("Sem conexão. Tente de novo.");
        return false;
      } finally {
        setOcupados((s) => {
          const n = new Set(s);
          n.delete(chave);
          return n;
        });
      }
    },
    [router]
  );

  return {
    ocupados,
    mensagem,
    limparMensagem: () => setMensagem(null),
    criar: (dados: DadosTarefa) => rodar("nova", () => fetch("/api/tarefas", json("POST", dados))),
    atualizar: (tarefaId: string, manualId: string, dados: DadosTarefa) =>
      rodar(tarefaId, () => fetch(`/api/tarefas/${manualId}`, json("PATCH", dados))),
    excluir: (tarefaId: string, manualId: string) => rodar(tarefaId, () => fetch(`/api/tarefas/${manualId}`, json("DELETE"))),
    // Tarefa automatica: chama a API do modulo de origem.
    chamar: (tarefaId: string, c: Chamada) => rodar(tarefaId, () => fetch(c.url, json("PATCH", c.corpo))),
  };
}

export type Acoes = ReturnType<typeof useAcoes>;
