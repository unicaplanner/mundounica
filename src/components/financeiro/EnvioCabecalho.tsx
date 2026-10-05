"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { formatarReais, normalizarNumero, paraCampo } from "@/lib/financeiro/formato";
import { IconeLapis, IconeLixeira, botaoIcone } from "./Icones";
import { botaoPrimario, botaoSecundario, campo, rotulo } from "./estilos";

// Nome, regra de uso e % dos pedidos de uma embalagem de envio, com lapis
// pra editar e lixeira pra excluir.
export function EnvioCabecalho({
  id: envioId,
  nome,
  quando,
  percentual,
  custo,
  incompleto,
}: {
  id: string;
  nome: string;
  quando: string | null;
  percentual: number;
  custo: number;
  incompleto: boolean;
}) {
  const id = useId();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editando, setEditando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [form, setForm] = useState({ nome, quando: quando ?? "", percentual: paraCampo(percentual) });
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErroMsg(null);
    const resultado = await enviar(`/api/financeiro/envios/${envioId}`, "PATCH", {
      nome: form.nome,
      quando: form.quando,
      percentual: normalizarNumero(form.percentual),
    });
    if (!resultado.ok) {
      setErroMsg(resultado.erro);
      return;
    }
    setEditando(false);
    startTransition(() => router.refresh());
  }

  async function excluir() {
    const resultado = await enviar(`/api/financeiro/envios/${envioId}`, "DELETE");
    setExcluindo(false);
    if (!resultado.ok) {
      setErroMsg(resultado.erro);
      return;
    }
    startTransition(() => router.refresh());
  }

  if (editando) {
    return (
      <form onSubmit={salvar} className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor={`${id}-nome`} className={rotulo}>
            Nome
          </label>
          <input
            id={`${id}-nome`}
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            className={`${campo} w-44`}
          />
        </div>
        <div className="min-w-0 flex-1 basis-64">
          <label htmlFor={`${id}-quando`} className={rotulo}>
            Quando usar
          </label>
          <input
            id={`${id}-quando`}
            value={form.quando}
            onChange={(e) => setForm({ ...form, quando: e.target.value })}
            className={`${campo} w-full`}
          />
        </div>
        <div>
          <label htmlFor={`${id}-pct`} className={rotulo}>
            % dos pedidos
          </label>
          <input
            id={`${id}-pct`}
            inputMode="decimal"
            value={form.percentual}
            onChange={(e) => setForm({ ...form, percentual: e.target.value })}
            className={`${campo} w-20`}
          />
        </div>
        <button type="submit" disabled={isPending} className={botaoPrimario}>
          Salvar
        </button>
        <button type="button" onClick={() => setEditando(false)} className={botaoSecundario}>
          Cancelar
        </button>
        {erroMsg && <p className="w-full text-xs text-alerta">{erroMsg}</p>}
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-serif text-xl font-semibold text-ink">{nome}</h2>
        {quando && <p className="text-sm text-muted">{quando}</p>}
        <p className="mt-1 text-xs text-muted">
          <span className="font-semibold text-ink">{paraCampo(percentual)}%</span> dos pedidos
        </p>
      </div>
      <div className="flex items-start gap-3">
        <div className="text-right">
          <p className="text-xs text-muted">Custo por pedido</p>
          <p className="font-serif text-2xl font-semibold tabular-nums text-ink">{formatarReais(custo)}</p>
          {incompleto && <p className="text-xs text-alerta">incompleto</p>}
        </div>
        {excluindo ? (
          <div className="flex items-center gap-2 rounded-xl bg-alerta-soft px-3 py-2 text-xs">
            <span className="font-semibold text-alerta">Excluir {nome}?</span>
            <button
              type="button"
              onClick={excluir}
              disabled={isPending}
              className="rounded-full bg-alerta px-3 py-1 font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              Excluir
            </button>
            <button type="button" onClick={() => setExcluindo(false)} className={botaoSecundario}>
              Cancelar
            </button>
          </div>
        ) : (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => {
                setErroMsg(null);
                setForm({ nome, quando: quando ?? "", percentual: paraCampo(percentual) });
                setEditando(true);
              }}
              aria-label={`Editar ${nome}`}
              title="Editar"
              className={botaoIcone}
            >
              <IconeLapis />
            </button>
            <button
              type="button"
              onClick={() => setExcluindo(true)}
              aria-label={`Excluir ${nome}`}
              title="Excluir"
              className={botaoIcone}
            >
              <IconeLixeira />
            </button>
          </div>
        )}
      </div>
      {erroMsg && <p className="w-full text-xs text-alerta">{erroMsg}</p>}
    </div>
  );
}

// Criar uma embalagem nova, ou as tres de hoje quando ainda nao tem nenhuma.
export function NovoEnvio({ vazio }: { vazio: boolean }) {
  const id = useId();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [nome, setNome] = useState("");
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  async function criar(body: Record<string, unknown>) {
    setErroMsg(null);
    const resultado = await enviar("/api/financeiro/envios", "POST", body);
    if (!resultado.ok) {
      setErroMsg(resultado.erro);
      return;
    }
    setNome("");
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-3 rounded-2xl border border-dashed border-border p-4">
      {vazio && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => criar({ padrao: true })} disabled={isPending} className={botaoPrimario}>
            Começar com Caixa Planner, Caixa Bloco e Caixa A4
          </button>
          <span className="text-xs text-muted">Já vem com a regra de cada uma, o % estimado pelos seus pedidos e a caixa, a seda, o adesivo e a etiqueta de cada uma.</span>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          criar({ nome });
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <div>
          <label htmlFor={`${id}-nome`} className={rotulo}>
            {vazio ? "Ou crie uma embalagem com outro nome" : "Nova embalagem de envio"}
          </label>
          <input
            id={`${id}-nome`}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Caixa Presente"
            className={`${campo} w-56`}
          />
        </div>
        <button type="submit" disabled={isPending} className={botaoSecundario}>
          Adicionar embalagem
        </button>
      </form>
      {erroMsg && <p className="text-xs text-alerta">{erroMsg}</p>}
    </div>
  );
}
