"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { botaoPrimario, campo, rotulo } from "./estilos";

const hoje = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

// Saldo em conta numa data: o ponto de partida do fluxo de caixa.
export function SaldoCaixa({ temSaldo }: { temSaldo: boolean }) {
  const id = useId();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saldo, setSaldo] = useState("");
  const [data, setData] = useState(hoje);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const resultado = await enviar("/api/financeiro/configuracao", "PATCH", { saldoCaixa: saldo, saldoCaixaData: data });
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    setSaldo("");
    startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={salvar} className="flex flex-wrap items-end gap-2">
      <div>
        <label htmlFor={`${id}-saldo`} className={rotulo}>
          {temSaldo ? "Atualizar saldo em conta (R$)" : "Saldo em conta hoje (R$)"}
        </label>
        <input
          id={`${id}-saldo`}
          inputMode="decimal"
          value={saldo}
          onChange={(e) => setSaldo(e.target.value)}
          placeholder="ex.: 2.350,00"
          className={`${campo} w-36`}
        />
      </div>
      <div>
        <label htmlFor={`${id}-data`} className={rotulo}>
          Em
        </label>
        <input id={`${id}-data`} type="date" value={data} onChange={(e) => setData(e.target.value)} className={campo} />
      </div>
      <button type="submit" disabled={isPending || !saldo.trim()} className={botaoPrimario}>
        Salvar saldo
      </button>
      {erro && <p className="w-full text-xs text-alerta">{erro}</p>}
    </form>
  );
}
