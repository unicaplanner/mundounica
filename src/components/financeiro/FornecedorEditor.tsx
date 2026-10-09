"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { IconeLixeira, botaoIcone } from "./Icones";
import { botaoPrimario, botaoSecundario, campo, rotulo } from "./estilos";

const dataBR = (iso: string) => {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
};
const hoje = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

// Dados de contato do fornecedor (nome, WhatsApp, link, observacoes).
export function FornecedorDados({
  id: fornecedorId,
  nome,
  whatsapp,
  link,
  observacoes,
}: {
  id: string;
  nome: string;
  whatsapp: string | null;
  link: string | null;
  observacoes: string | null;
}) {
  const id = useId();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ nome, whatsapp: whatsapp ?? "", link: link ?? "", observacoes: observacoes ?? "" });
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErroMsg(null);
    const resultado = await enviar(`/api/financeiro/fornecedores/${fornecedorId}`, "PATCH", form);
    if (!resultado.ok) {
      setErroMsg(resultado.erro);
      return;
    }
    setEditando(false);
    startTransition(() => router.refresh());
  }

  if (!editando) {
    return (
      <button type="button" onClick={() => setEditando(true)} className={botaoSecundario}>
        Editar dados
      </button>
    );
  }

  return (
    <form onSubmit={salvar} className="space-y-3 rounded-xl bg-accent-soft/50 p-4">
      <div className="flex flex-wrap gap-3">
        <div>
          <label htmlFor={`${id}-nome`} className={rotulo}>
            Nome
          </label>
          <input id={`${id}-nome`} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className={`${campo} w-56`} />
        </div>
        <div>
          <label htmlFor={`${id}-whats`} className={rotulo}>
            WhatsApp (com DDD)
          </label>
          <input
            id={`${id}-whats`}
            inputMode="tel"
            placeholder="11 98765-4321"
            value={form.whatsapp}
            onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
            className={`${campo} w-40`}
          />
        </div>
        <div className="min-w-0 flex-1 basis-64">
          <label htmlFor={`${id}-link`} className={rotulo}>
            Loja ou anúncio
          </label>
          <input
            id={`${id}-link`}
            type="url"
            placeholder="https://..."
            value={form.link}
            onChange={(e) => setForm({ ...form, link: e.target.value })}
            className={`${campo} w-full`}
          />
        </div>
      </div>
      <div>
        <label htmlFor={`${id}-obs`} className={rotulo}>
          Observações (prazo de entrega, pedido mínimo, forma de pagamento...)
        </label>
        <textarea
          id={`${id}-obs`}
          rows={3}
          value={form.observacoes}
          onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
          className={`${campo} w-full`}
        />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className={botaoPrimario}>
          Salvar
        </button>
        <button type="button" onClick={() => setEditando(false)} className={botaoSecundario}>
          Cancelar
        </button>
      </div>
      {erroMsg && <p className="text-xs text-alerta">{erroMsg}</p>}
    </form>
  );
}

// Registro de mensagens importantes com o fornecedor.
export function MensagensFornecedor({
  id: fornecedorId,
  mensagens,
}: {
  id: string;
  mensagens: { id: string; data: string; texto: string }[];
}) {
  const id = useId();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [texto, setTexto] = useState("");
  const [data, setData] = useState(hoje);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    setErroMsg(null);
    const resultado = await enviar(`/api/financeiro/fornecedores/${fornecedorId}/mensagens`, "POST", { texto, data });
    if (!resultado.ok) {
      setErroMsg(resultado.erro);
      return;
    }
    setTexto("");
    startTransition(() => router.refresh());
  }

  async function remover(msgId: string) {
    setExcluindo(null);
    const resultado = await enviar(`/api/financeiro/fornecedores/${fornecedorId}/mensagens/${msgId}`, "DELETE");
    if (!resultado.ok) setErroMsg(resultado.erro);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-3">
      <form onSubmit={adicionar} className="flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor={`${id}-data`} className={rotulo}>
            Data
          </label>
          <input id={`${id}-data`} type="date" value={data} onChange={(e) => setData(e.target.value)} className={campo} />
        </div>
        <div className="min-w-0 flex-1 basis-64">
          <label htmlFor={`${id}-texto`} className={rotulo}>
            Mensagem importante
          </label>
          <input
            id={`${id}-texto`}
            placeholder="Ex: combinou 10% de desconto acima de 100 unidades"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className={`${campo} w-full`}
          />
        </div>
        <button type="submit" disabled={isPending || !texto.trim()} className={botaoPrimario}>
          Registrar
        </button>
      </form>
      {erroMsg && <p className="text-xs text-alerta">{erroMsg}</p>}
      {mensagens.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma mensagem registrada.</p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {mensagens.map((m) => (
            <li key={m.id} className={`flex items-start gap-3 py-2.5 text-sm ${excluindo === m.id ? "bg-alerta-soft" : ""}`}>
              <span className="w-20 shrink-0 tabular-nums text-xs text-muted">{dataBR(m.data)}</span>
              <span className="min-w-0 flex-1 text-ink">{m.texto}</span>
              {excluindo === m.id ? (
                <span className="flex items-center gap-2 text-xs">
                  <button type="button" onClick={() => remover(m.id)} className="font-semibold text-alerta underline">
                    Excluir
                  </button>
                  <button type="button" onClick={() => setExcluindo(null)} className="text-muted underline">
                    Cancelar
                  </button>
                </span>
              ) : (
                <button type="button" onClick={() => setExcluindo(m.id)} aria-label="Excluir mensagem" title="Excluir" className={botaoIcone}>
                  <IconeLixeira />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
