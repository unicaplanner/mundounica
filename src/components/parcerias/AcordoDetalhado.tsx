"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { enviar } from "@/lib/financeiro/enviar";
import { formatarReais } from "@/lib/financeiro/formato";
import { IconeLixeira, botaoIcone } from "@/components/financeiro/Icones";
import { botaoPrimario, botaoSecundario, campo, rotulo } from "@/components/financeiro/estilos";

type Link = { id: string; titulo: string; url: string };
type Pagamento = { id: string; descricao: string; valor: number; vencimento: string; pagoEm: string };

const dataBR = (iso: string) => {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
};
const hoje = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

// Pasta do Drive, documentos da parceria e parcelas do cache.
export function AcordoDetalhado({
  criadoraId,
  pastaDrive,
  links,
  pagamentos,
}: {
  criadoraId: string;
  pastaDrive: string | null;
  links: Link[];
  pagamentos: Pagamento[];
}) {
  const id = useId();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [novoLink, setNovoLink] = useState({ titulo: "", url: "" });
  const [novaParcela, setNovaParcela] = useState({ descricao: "", valor: "", vencimento: "" });
  const [erroMsg, setErroMsg] = useState<string | null>(null);
  const base = `/api/parcerias/criadoras/${criadoraId}`;

  async function chamar(url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) {
    setErroMsg(null);
    const r = await enviar(url, method, body);
    if (!r.ok) {
      setErroMsg(r.erro);
      return false;
    }
    startTransition(() => router.refresh());
    return true;
  }

  const total = pagamentos.reduce((a, p) => a + p.valor, 0);
  const pago = pagamentos.filter((p) => p.pagoEm).reduce((a, p) => a + p.valor, 0);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-ink">Pasta e documentos</h4>
        <div className="flex flex-wrap gap-2">
          {pastaDrive && (
            <a href={pastaDrive} target="_blank" rel="noopener noreferrer" className={botaoPrimario}>
              Abrir pasta no Drive ↗
            </a>
          )}
          {links.map((l) => (
            <span key={l.id} className="group inline-flex items-center gap-1">
              <a href={l.url} target="_blank" rel="noopener noreferrer" className={botaoSecundario}>
                {l.titulo} ↗
              </a>
              <button
                type="button"
                onClick={() => chamar(`${base}/links/${l.id}`, "DELETE")}
                aria-label={`Tirar ${l.titulo}`}
                title="Tirar link"
                className={`${botaoIcone} opacity-50 group-hover:opacity-100`}
              >
                <IconeLixeira />
              </button>
            </span>
          ))}
          {!pastaDrive && links.length === 0 && <p className="text-sm text-muted">Nenhum documento ainda.</p>}
        </div>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await chamar(`${base}/links`, "POST", novoLink)) setNovoLink({ titulo: "", url: "" });
          }}
        >
          <div>
            <label htmlFor={`${id}-lt`} className={rotulo}>
              Novo documento
            </label>
            <input
              id={`${id}-lt`}
              placeholder="Termo assinado"
              value={novoLink.titulo}
              onChange={(e) => setNovoLink({ ...novoLink, titulo: e.target.value })}
              className={`${campo} w-40`}
            />
          </div>
          <div className="min-w-0 flex-1 basis-56">
            <label htmlFor={`${id}-lu`} className={rotulo}>
              Link
            </label>
            <input
              id={`${id}-lu`}
              type="url"
              placeholder="https://drive.google.com/..."
              value={novoLink.url}
              onChange={(e) => setNovoLink({ ...novoLink, url: e.target.value })}
              className={`${campo} w-full`}
            />
          </div>
          <button type="submit" disabled={isPending || !novoLink.titulo.trim() || !novoLink.url.trim()} className={botaoSecundario}>
            Adicionar
          </button>
        </form>
      </div>

      <div className="space-y-2">
        <h4 className="flex flex-wrap items-baseline justify-between gap-2 text-sm font-semibold text-ink">
          Pagamento do cachê
          {pagamentos.length > 0 && (
            <span className="text-xs font-normal tabular-nums text-muted">
              pago {formatarReais(pago)} de {formatarReais(total)}
            </span>
          )}
        </h4>
        {pagamentos.length > 0 && (
          <ul className="divide-y divide-border border-y border-border">
            {pagamentos.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                <span className="min-w-0 flex-1 text-ink">
                  {p.descricao}
                  {p.vencimento && <span className="ml-2 text-xs text-muted">vence {dataBR(p.vencimento)}</span>}
                </span>
                <span className="tabular-nums text-ink">{formatarReais(p.valor)}</span>
                {p.pagoEm ? (
                  <button
                    type="button"
                    onClick={() => chamar(`${base}/pagamentos/${p.id}`, "PATCH", { pagoEm: "" })}
                    title="Desmarcar"
                    className="rounded-full bg-ok-soft px-2.5 py-0.5 text-xs font-semibold text-ok"
                  >
                    pago em {dataBR(p.pagoEm)}
                  </button>
                ) : (
                  <button type="button" onClick={() => chamar(`${base}/pagamentos/${p.id}`, "PATCH", { pagoEm: hoje() })} className={botaoSecundario}>
                    Marcar pago hoje
                  </button>
                )}
                <button type="button" onClick={() => chamar(`${base}/pagamentos/${p.id}`, "DELETE")} aria-label="Excluir parcela" title="Excluir" className={botaoIcone}>
                  <IconeLixeira />
                </button>
              </li>
            ))}
          </ul>
        )}
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await chamar(`${base}/pagamentos`, "POST", novaParcela)) setNovaParcela({ descricao: "", valor: "", vencimento: "" });
          }}
        >
          <div className="min-w-0 flex-1 basis-48">
            <label htmlFor={`${id}-pd`} className={rotulo}>
              Nova parcela
            </label>
            <input
              id={`${id}-pd`}
              placeholder="50% no fechamento"
              value={novaParcela.descricao}
              onChange={(e) => setNovaParcela({ ...novaParcela, descricao: e.target.value })}
              className={`${campo} w-full`}
            />
          </div>
          <div>
            <label htmlFor={`${id}-pv`} className={rotulo}>
              Valor (R$)
            </label>
            <input
              id={`${id}-pv`}
              inputMode="decimal"
              value={novaParcela.valor}
              onChange={(e) => setNovaParcela({ ...novaParcela, valor: e.target.value })}
              className={`${campo} w-28`}
            />
          </div>
          <div>
            <label htmlFor={`${id}-pvc`} className={rotulo}>
              Vencimento
            </label>
            <input
              id={`${id}-pvc`}
              type="date"
              value={novaParcela.vencimento}
              onChange={(e) => setNovaParcela({ ...novaParcela, vencimento: e.target.value })}
              className={campo}
            />
          </div>
          <button type="submit" disabled={isPending || !novaParcela.descricao.trim() || !novaParcela.valor.trim()} className={botaoSecundario}>
            Adicionar
          </button>
        </form>
      </div>
      {erroMsg && <p className="text-xs text-alerta">{erroMsg}</p>}
    </div>
  );
}
