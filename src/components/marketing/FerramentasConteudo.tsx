"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { chamarApi } from "@/components/marketing/Acoes";
import { EditarConteudo } from "@/components/marketing/EditarConteudo";
import type { ConteudoCompleto } from "@/components/marketing/DetalhesConteudo";
import { botaoPrimario, botaoSecundario, campo } from "@/components/financeiro/estilos";
import { dataCurta, diaISO, hojeISO } from "@/lib/marketing/datas";

// Ferramentas da ficha: editar, duplicar, arquivar e, quando o post passou
// da data sem ser postado, remarcar / "postei em" / "nao vou postar".

export function FerramentasConteudo({ c }: { c: ConteudoCompleto }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editando, setEditando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [copia, setCopia] = useState<string | null>(null);
  const hoje = hojeISO();
  const [novoDia, setNovoDia] = useState(hoje);
  const [diaPostado, setDiaPostado] = useState(hoje);
  const dia = diaISO(c.data);
  const vencido = !c.arquivadoEm && c.status !== "publicado" && dia < hoje;

  async function acao(corpo: Record<string, unknown>, depois?: (r: Record<string, unknown>) => void) {
    setOcupado(true);
    setMensagem(null);
    try {
      const r = await chamarApi(`/api/marketing/conteudos/${c.id}`, corpo);
      startTransition(() => router.refresh());
      depois?.(r);
    } catch (e) {
      setMensagem((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  if (editando) {
    return (
      <EditarConteudo
        id={c.id}
        inicial={{ ...c, data: dia }}
        onPronto={() => setEditando(false)}
        onCancelar={() => setEditando(false)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {vencido && (
        <section className="flex flex-col gap-3 rounded-2xl border border-atencao/40 bg-atencao-soft p-4">
          <p className="text-sm text-ink">
            Este post era pra <strong>{dataCurta(dia)}</strong> e não foi marcado como postado. Tudo bem: escolha o que fazer.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="text-xs font-semibold text-ink sm:w-28">Remarcar pra</span>
            <input type="date" value={novoDia} min={hoje} onChange={(e) => setNovoDia(e.target.value)} className={campo} aria-label="Novo dia" />
            <button type="button" disabled={ocupado} onClick={() => acao({ acao: "remarcar", data: novoDia })} className={botaoPrimario}>
              Remarcar
            </button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="text-xs font-semibold text-ink sm:w-28">Já postei em</span>
            <input type="date" value={diaPostado} max={hoje} onChange={(e) => setDiaPostado(e.target.value)} className={campo} aria-label="Dia em que postou" />
            <button type="button" disabled={ocupado} onClick={() => acao({ acao: "publicado", dataReal: diaPostado })} className={botaoSecundario}>
              Postei
            </button>
          </div>
          <button
            type="button"
            disabled={ocupado}
            onClick={() => {
              if (window.confirm("Arquivar este post? Ele sai do calendário e das tarefas, mas fica guardado.")) acao({ acao: "arquivar" });
            }}
            className="self-start text-xs text-muted underline"
          >
            Não vou postar (arquivar)
          </button>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setEditando(true)} className={botaoSecundario}>
          ✎ Editar
        </button>
        <button type="button" disabled={ocupado} onClick={() => acao({ acao: "duplicar" }, (r) => setCopia(String(r.id)))} className={botaoSecundario}>
          Duplicar
        </button>
        {c.arquivadoEm ? (
          <button type="button" disabled={ocupado} onClick={() => acao({ acao: "desarquivar" })} className={botaoSecundario}>
            Desarquivar
          </button>
        ) : (
          <button
            type="button"
            disabled={ocupado}
            onClick={() => {
              if (window.confirm("Arquivar este post? Ele sai do calendário e das tarefas, mas fica guardado.")) acao({ acao: "arquivar" });
            }}
            className={botaoSecundario}
          >
            Arquivar
          </button>
        )}
        {copia && (
          <Link href={`/marketing/conteudo/${copia}`} className="text-xs font-semibold text-ink underline">
            Cópia criada: abrir e mudar a data →
          </Link>
        )}
        {mensagem && <span className="text-xs text-alerta">{mensagem}</span>}
      </div>
    </div>
  );
}
