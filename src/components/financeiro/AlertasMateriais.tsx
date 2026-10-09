import Link from "next/link";
import type { AlertaMaterial } from "@/lib/financeiro/alertas";
import { formatarReais } from "@/lib/financeiro/formato";

const pct = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const dataBR = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" });

// Aviso de material que ficou mais caro na ultima compra, com os produtos
// que usam ele e agora estao abaixo da meta.
export function AlertasMateriais({ alertas }: { alertas: AlertaMaterial[] }) {
  if (alertas.length === 0) return null;
  return (
    <section className="space-y-2">
      {alertas.map((a) => (
        <details key={a.materialId} className="rounded-2xl bg-atencao-soft px-4 py-3 text-sm text-atencao" open={a.produtos.length > 0}>
          <summary className="cursor-pointer">
            <strong>
              <Link href={`/financeiro/materiais/${a.materialId}`} className="underline">
                {a.material}
              </Link>{" "}
              subiu {pct(a.subiuPct)}
            </strong>{" "}
            na compra de {dataBR.format(a.data)} ({formatarReais(a.antes, 4)} → {formatarReais(a.agora, 4)}/{a.unidade})
            {a.produtos.length > 0
              ? ` — ${a.produtos.length} ${a.produtos.length === 1 ? "produto ficou" : "produtos ficaram"} abaixo da meta`
              : " — nenhum produto saiu da meta"}
          </summary>
          {a.produtos.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs text-ink/80">
              {a.produtos.slice(0, 15).map((p) => (
                <li key={p.rotulo}>
                  <Link href={`/financeiro/produtos/${p.produtoId}`} className="underline">
                    {p.rotulo}
                  </Link>{" "}
                  — margem {pct(p.margemPct)} (meta {pct(p.meta)})
                </li>
              ))}
              {a.produtos.length > 15 && <li>e mais {a.produtos.length - 15}…</li>}
            </ul>
          )}
        </details>
      ))}
    </section>
  );
}
