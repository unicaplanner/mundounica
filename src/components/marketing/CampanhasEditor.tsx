"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { chamarApi } from "@/components/marketing/Acoes";
import { CampanhaForm, type ValoresCampanha } from "@/components/marketing/CampanhaForm";
import { botaoPrimario, botaoSecundario, campo, rotulo } from "@/components/financeiro/estilos";

// Botoes da pagina de campanhas: nova, editar, arquivar, e as datas da marca.

export function NovaCampanha({ prazoFilaDias }: { prazoFilaDias: number | null }) {
  const [aberto, setAberto] = useState(false);
  if (!aberto)
    return (
      <button type="button" onClick={() => setAberto(true)} className={`${botaoPrimario} self-start`}>
        ＋ Nova campanha
      </button>
    );
  return <CampanhaForm inicial={{}} prazoFilaDias={prazoFilaDias} onPronto={() => setAberto(false)} />;
}

export function EditarCampanha({
  id,
  inicial,
  prazoFilaDias,
  arquivada,
}: {
  id: string;
  inicial: ValoresCampanha;
  prazoFilaDias: number | null;
  arquivada: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editando, setEditando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  if (editando) return <CampanhaForm id={id} inicial={inicial} prazoFilaDias={prazoFilaDias} onPronto={() => setEditando(false)} />;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => setEditando(true)} className={botaoSecundario}>
        ✎ Editar
      </button>
      <button
        type="button"
        onClick={async () => {
          try {
            await chamarApi(`/api/marketing/campanhas/${id}`, { acao: arquivada ? "desarquivar" : "arquivar" });
            startTransition(() => router.refresh());
          } catch (e) {
            setMensagem((e as Error).message);
          }
        }}
        className={botaoSecundario}
      >
        {arquivada ? "Desarquivar" : "Arquivar"}
      </button>
      {mensagem && <span className="text-xs text-alerta">{mensagem}</span>}
    </div>
  );
}

export function NovaData() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [v, setV] = useState({ titulo: "", tipo: "marca", inicio: "", fim: "", nota: "", recorrente: false });
  const [mensagem, setMensagem] = useState<string | null>(null);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setMensagem(null);
        try {
          await chamarApi("/api/marketing/datas", v, "POST");
          setV({ titulo: "", tipo: "marca", inicio: "", fim: "", nota: "", recorrente: false });
          startTransition(() => router.refresh());
        } catch (err) {
          setMensagem((err as Error).message);
        }
      }}
      className="grid grid-cols-1 gap-2 rounded-xl border border-dashed border-border p-3 sm:grid-cols-5 sm:items-end"
    >
      <label className="flex flex-col sm:col-span-2">
        <span className={rotulo}>Data</span>
        <input value={v.titulo} onChange={(e) => setV({ ...v, titulo: e.target.value })} className={campo} placeholder="ex: Volta às aulas" />
      </label>
      <label className="flex flex-col">
        <span className={rotulo}>De</span>
        <input type="date" value={v.inicio} onChange={(e) => setV({ ...v, inicio: e.target.value })} className={campo} />
      </label>
      <label className="flex flex-col">
        <span className={rotulo}>Até (opcional)</span>
        <input type="date" value={v.fim} onChange={(e) => setV({ ...v, fim: e.target.value })} className={campo} />
      </label>
      <label className="flex flex-col">
        <span className={rotulo}>Tipo</span>
        <select value={v.tipo} onChange={(e) => setV({ ...v, tipo: e.target.value })} className={campo}>
          <option value="marca">Da marca</option>
          <option value="pico">Pico de busca</option>
          <option value="sazonal">Sazonal</option>
          <option value="recesso">Recesso</option>
          <option value="feriado">Feriado</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-xs text-ink sm:col-span-2">
        <input type="checkbox" checked={v.recorrente} onChange={(e) => setV({ ...v, recorrente: e.target.checked })} />
        Repete todo ano
      </label>
      <div className="flex items-center gap-2 sm:col-span-3">
        <button type="submit" className={botaoSecundario}>
          Adicionar data
        </button>
        {mensagem && <span className="text-xs text-alerta">{mensagem}</span>}
      </div>
    </form>
  );
}

export function TirarData({ id }: { id: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={async () => {
        if (!window.confirm("Tirar esta data do calendário?")) return;
        await fetch(`/api/marketing/datas/${id}`, { method: "DELETE" });
        startTransition(() => router.refresh());
      }}
      className="text-xs text-muted underline"
    >
      tirar
    </button>
  );
}
