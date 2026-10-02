"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { formatarQuantidade, formatarReais, normalizarNumero, paraCampo } from "@/lib/financeiro/formato";
import { IconeLapis, IconeLixeira, botaoIcone } from "./Icones";
import { botaoPrimario, botaoSecundario, campo } from "./estilos";

export type CompraLinha = {
  id: string;
  data: string; // AAAA-MM-DD (horario de Sao Paulo)
  materialId: string;
  materialNome: string;
  unidade: string;
  quantidade: number;
  valorTotal: number;
  custoUnitario: number;
  fornecedor: string | null;
};

type Material = { id: string; nome: string; unidade: string };

function dataBR(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

export function ComprasTabela({ compras, materiais }: { compras: CompraLinha[]; materiais: Material[] }) {
  const [editando, setEditando] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm [&_td]:pr-4 [&_th]:pr-4">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th className="py-2 font-semibold">Data</th>
            <th className="py-2 font-semibold">Material</th>
            <th className="py-2 font-semibold">Quantidade</th>
            <th className="py-2 font-semibold">Valor pago</th>
            <th className="py-2 font-semibold">Custo unitário</th>
            <th className="py-2 font-semibold">Fornecedor</th>
            <th className="py-2">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {compras.map((c) =>
            editando === c.id ? (
              <LinhaEdicao key={c.id} compra={c} materiais={materiais} onFechar={() => setEditando(null)} />
            ) : (
              <LinhaLeitura
                key={c.id}
                compra={c}
                confirmandoExclusao={excluindo === c.id}
                onEditar={() => {
                  setExcluindo(null);
                  setEditando(c.id);
                }}
                onPedirExclusao={() => setExcluindo(c.id)}
                onCancelarExclusao={() => setExcluindo(null)}
              />
            )
          )}
        </tbody>
      </table>
    </div>
  );
}

function LinhaLeitura({
  compra: c,
  confirmandoExclusao,
  onEditar,
  onPedirExclusao,
  onCancelarExclusao,
}: {
  compra: CompraLinha;
  confirmandoExclusao: boolean;
  onEditar: () => void;
  onPedirExclusao: () => void;
  onCancelarExclusao: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  async function excluir() {
    const resultado = await enviar(`/api/financeiro/compras/${c.id}`, "DELETE");
    if (!resultado.ok) {
      setErroMsg(resultado.erro);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <tr className={`border-b border-border ${confirmandoExclusao ? "bg-alerta-soft" : ""}`}>
      <td className="py-2.5 tabular-nums text-muted">{dataBR(c.data)}</td>
      <td className="py-2.5 font-semibold text-ink">{c.materialNome}</td>
      <td className="py-2.5 tabular-nums">
        {formatarQuantidade(c.quantidade)} {c.unidade}
      </td>
      <td className="py-2.5 tabular-nums">{formatarReais(c.valorTotal)}</td>
      <td className="py-2.5 tabular-nums">{formatarReais(c.custoUnitario, 4)}</td>
      <td className="py-2.5 text-muted">{c.fornecedor ?? "—"}</td>
      <td className="py-1.5 text-right">
        {confirmandoExclusao ? (
          <div className="flex items-center justify-end gap-2 whitespace-nowrap">
            <span className="text-xs font-semibold text-alerta">Excluir esta compra?</span>
            <button
              type="button"
              onClick={excluir}
              disabled={isPending}
              className="rounded-full bg-alerta px-3 py-1 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              Excluir
            </button>
            <button type="button" onClick={onCancelarExclusao} className={botaoSecundario}>
              Cancelar
            </button>
          </div>
        ) : (
          <div className="flex justify-end gap-1">
            <button type="button" onClick={onEditar} aria-label={`Editar compra de ${c.materialNome}, ${dataBR(c.data)}`} title="Editar" className={botaoIcone}>
              <IconeLapis />
            </button>
            <button
              type="button"
              onClick={onPedirExclusao}
              aria-label={`Excluir compra de ${c.materialNome}, ${dataBR(c.data)}`}
              title="Excluir"
              className={botaoIcone}
            >
              <IconeLixeira />
            </button>
          </div>
        )}
        {erroMsg && <p className="mt-1 text-xs text-alerta">{erroMsg}</p>}
      </td>
    </tr>
  );
}

function LinhaEdicao({
  compra: c,
  materiais,
  onFechar,
}: {
  compra: CompraLinha;
  materiais: Material[];
  onFechar: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [materialId, setMaterialId] = useState(c.materialId);
  const [data, setData] = useState(c.data);
  const [quantidade, setQuantidade] = useState(paraCampo(c.quantidade));
  const [valorTotal, setValorTotal] = useState(paraCampo(c.valorTotal, 2));
  const [fornecedor, setFornecedor] = useState(c.fornecedor ?? "");
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  const unidade = materiais.find((m) => m.id === materialId)?.unidade ?? c.unidade;
  const qtd = Number(normalizarNumero(quantidade));
  const total = Number(normalizarNumero(valorTotal));
  const custo = qtd > 0 && total > 0 ? total / qtd : null;

  async function salvar() {
    setErroMsg(null);
    const resultado = await enviar(`/api/financeiro/compras/${c.id}`, "PATCH", {
      materialId,
      data,
      quantidade: normalizarNumero(quantidade),
      valorTotal: normalizarNumero(valorTotal),
      fornecedor,
    });
    if (!resultado.ok) {
      setErroMsg(resultado.erro);
      return;
    }
    onFechar();
    startTransition(() => router.refresh());
  }

  const campoPequeno = `${campo} py-1 text-xs`;

  return (
    <tr className="border-b border-border bg-accent-soft/60">
      <td className="py-2 pr-2">
        <input
          type="date"
          aria-label="Data da compra"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className={`${campoPequeno} w-[8.5rem]`}
        />
      </td>
      <td className="py-2 pr-2">
        <select
          aria-label="Material"
          value={materialId}
          onChange={(e) => setMaterialId(e.target.value)}
          className={`${campoPequeno} max-w-[11rem]`}
        >
          {materiais.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </select>
      </td>
      <td className="py-2 pr-2">
        <div className="flex items-center gap-1">
          <input
            type="text"
            inputMode="decimal"
            aria-label={`Quantidade (${unidade})`}
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            className={`${campoPequeno} w-20`}
          />
          <span className="text-xs text-muted">{unidade}</span>
        </div>
      </td>
      <td className="py-2 pr-2">
        <input
          type="text"
          inputMode="decimal"
          aria-label="Valor total pago (R$)"
          value={valorTotal}
          onChange={(e) => setValorTotal(e.target.value)}
          className={`${campoPequeno} w-24`}
        />
      </td>
      <td className="py-2 pr-2 text-xs tabular-nums text-muted">{custo !== null ? formatarReais(custo, 4) : "—"}</td>
      <td className="py-2 pr-2">
        <input
          type="text"
          aria-label="Fornecedor"
          value={fornecedor}
          onChange={(e) => setFornecedor(e.target.value)}
          className={`${campoPequeno} w-32`}
        />
      </td>
      <td className="py-2 text-right">
        <div className="flex justify-end gap-2 whitespace-nowrap">
          <button type="button" onClick={salvar} disabled={isPending} className={`${botaoPrimario} px-3 py-1 text-xs`}>
            Salvar
          </button>
          <button type="button" onClick={onFechar} className={botaoSecundario}>
            Cancelar
          </button>
        </div>
        {erroMsg && <p className="mt-1 text-left text-xs text-alerta">{erroMsg}</p>}
      </td>
    </tr>
  );
}
