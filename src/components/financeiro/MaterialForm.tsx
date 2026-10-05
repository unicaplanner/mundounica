"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { UNIDADES } from "@/lib/financeiro/unidades";
import { botaoPrimario, campo, rotulo } from "./estilos";

export function MaterialForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [nome, setNome] = useState("");
  const [unidade, setUnidade] = useState("folha");
  const [linkCompra, setLinkCompra] = useState("");
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErroMsg(null);
    const resultado = await enviar("/api/financeiro/materiais", "POST", { nome, unidade, linkCompra });
    if (!resultado.ok) {
      setErroMsg(resultado.erro);
      return;
    }
    setNome("");
    setLinkCompra("");
    startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="material-nome" className={rotulo}>
            Nome do material
          </label>
          <input
            id="material-nome"
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Papel couché 300g"
            className={`${campo} w-56`}
          />
        </div>
        <div>
          <label htmlFor="material-unidade" className={rotulo}>
            Unidade de compra e uso
          </label>
          <select
            id="material-unidade"
            value={unidade}
            onChange={(e) => setUnidade(e.target.value)}
            className={campo}
          >
            {UNIDADES.map((u) => (
              <option key={u.valor} value={u.valor}>
                {u.rotulo}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0 flex-1 basis-56">
          <label htmlFor="material-link" className={rotulo}>
            Link de compra (opcional)
          </label>
          <input
            id="material-link"
            type="url"
            value={linkCompra}
            onChange={(e) => setLinkCompra(e.target.value)}
            placeholder="https://www.mercadolivre.com.br/..."
            className={`${campo} w-full`}
          />
        </div>
        <button type="submit" disabled={isPending} className={botaoPrimario}>
          Cadastrar material
        </button>
      </div>
      {erroMsg && <p className="text-xs text-alerta">{erroMsg}</p>}
    </form>
  );
}
