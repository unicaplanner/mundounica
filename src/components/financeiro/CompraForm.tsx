"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { formatarReais, normalizarNumero } from "@/lib/financeiro/formato";
import { botaoPrimario, campo, rotulo } from "./estilos";

type Material = { id: string; nome: string; unidade: string };

function hojeEmSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export function CompraForm({ materiais, fornecedores = [] }: { materiais: Material[]; fornecedores?: string[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [materialId, setMaterialId] = useState(materiais[0]?.id ?? "");
  const [data, setData] = useState(hojeEmSaoPaulo);
  const [quantidade, setQuantidade] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [mensagem, setMensagem] = useState<{ texto: string; erro: boolean } | null>(null);

  const material = materiais.find((m) => m.id === materialId);
  const qtd = Number(normalizarNumero(quantidade));
  const total = Number(normalizarNumero(valorTotal));
  const custoUnitario = qtd > 0 && total > 0 ? total / qtd : null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMensagem(null);
    const resultado = await enviar("/api/financeiro/compras", "POST", {
      materialId,
      data,
      quantidade: normalizarNumero(quantidade),
      valorTotal: normalizarNumero(valorTotal),
      fornecedor,
    });
    if (!resultado.ok) {
      setMensagem({ texto: resultado.erro, erro: true });
      return;
    }
    setMensagem({ texto: `Compra de ${material?.nome} registrada.`, erro: false });
    setQuantidade("");
    setValorTotal("");
    setFornecedor("");
    startTransition(() => router.refresh());
  }

  if (materiais.length === 0) {
    return (
      <p className="text-sm text-muted">
        Cadastre o material primeiro em{" "}
        <Link href="/financeiro/materiais" className="text-ink underline">
          Materiais
        </Link>
        .
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="compra-material" className={rotulo}>
            Material
          </label>
          <select
            id="compra-material"
            value={materialId}
            onChange={(e) => setMaterialId(e.target.value)}
            className={campo}
          >
            {materiais.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="compra-data" className={rotulo}>
            Data da compra
          </label>
          <input
            id="compra-data"
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className={campo}
          />
        </div>
        <div>
          <label htmlFor="compra-quantidade" className={rotulo}>
            Quantidade{material ? ` (${material.unidade})` : ""}
          </label>
          <input
            id="compra-quantidade"
            type="text"
            inputMode="decimal"
            placeholder="500"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            className={`${campo} w-28`}
          />
        </div>
        <div>
          <label htmlFor="compra-valor" className={rotulo}>
            Valor total pago (R$)
          </label>
          <input
            id="compra-valor"
            type="text"
            inputMode="decimal"
            placeholder="125,90"
            value={valorTotal}
            onChange={(e) => setValorTotal(e.target.value)}
            className={`${campo} w-32`}
          />
        </div>
        <div>
          <label htmlFor="compra-fornecedor" className={rotulo}>
            Fornecedor (opcional)
          </label>
          <input
            id="compra-fornecedor"
            type="text"
            list="compra-fornecedores"
            value={fornecedor}
            onChange={(e) => setFornecedor(e.target.value)}
            className={`${campo} w-44`}
          />
          <datalist id="compra-fornecedores">
            {fornecedores.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={isPending} className={botaoPrimario}>
          Registrar compra
        </button>
        {custoUnitario !== null && (
          <p className="text-xs text-muted">
            Sai a <span className="font-semibold text-ink">{formatarReais(custoUnitario, 4)}</span> por{" "}
            {material?.unidade}
          </p>
        )}
        {mensagem && (
          <p role="status" className={`text-xs ${mensagem.erro ? "text-alerta" : "text-muted"}`}>
            {mensagem.texto}
          </p>
        )}
      </div>
    </form>
  );
}
