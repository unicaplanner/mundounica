import Link from "next/link";
import { CopiarTexto } from "@/components/marketing/Acoes";
import { avisosDosConteudos, avisosProximos, PRAZO_DIAS_UTEIS, type AvisoConteudo, type Fila } from "@/lib/marketing/alertas";
import { dataComDia } from "@/lib/marketing/datas";

// Avisos do Shopify ao vivo no Marketing: estoque do que o post divulga e a
// fila de pedidos da producao. Componentes de servidor: cada um busca o que
// precisa, entao basta colocar <AvisosCalendario /> ou <AvisosDoConteudo />.

const textoPrazo = (dias: number) => `até ${dias} dias úteis pra produzir, mais o tempo do frete`;

function Fila({ fila }: { fila: Fila }) {
  const cor = fila.nivel === "alerta" ? "bg-alerta-soft text-alerta" : fila.nivel === "atencao" ? "bg-atencao-soft text-atencao" : "bg-ok-soft text-ok";
  return (
    <div className={`flex flex-col gap-1 rounded-xl px-4 py-3 text-sm ${cor}`}>
      <p>
        <strong>Fila da produção:</strong> {fila.abertos} {fila.abertos === 1 ? "pedido aberto" : "pedidos abertos"}
        {fila.atrasados > 0
          ? `, ${fila.atrasados - fila.travados} já passaram dos ${PRAZO_DIAS_UTEIS} dias úteis.`
          : ", todos dentro do prazo."}
        {fila.travados > 0 && ` ${fila.travados} ${fila.travados === 1 ? "está parado" : "estão parados"} há mais de 40 dias úteis: confira na Central se ${fila.travados === 1 ? "é pré-venda ou foi esquecido" : "são pré-venda ou foram esquecidos"}.`}
      </p>
      <p className="text-ink/80">
        Prazo que dá pra prometer hoje (estimativa pela fila): <strong>{textoPrazo(fila.prazoRealDiasUteis)}</strong>.
        {fila.nivel !== "ok" && " Antes de agendar promoção, veja se a produção dá conta."}
      </p>
    </div>
  );
}

function Linha({ a, fila }: { a: AvisoConteudo; fila: Fila | null }) {
  return (
    <li className="flex flex-col gap-1 border-t border-border py-2.5 first:border-t-0">
      <Link href={`/marketing/conteudo/${a.conteudoId}`} className="text-sm font-semibold text-ink hover:underline">
        <span className="font-normal text-muted">{dataComDia(a.data)} · </span>
        {a.titulo}
      </Link>
      <ul className="flex flex-col gap-0.5 text-xs">
        {a.estoque.map((e) => (
          <li key={e.titulo} className={e.esgotado ? "text-alerta" : "text-atencao"}>
            {e.esgotado ? "Esgotado" : "Estoque baixo"}: {e.titulo}
            {!e.esgotado && ` (${e.total} no total`}
            {!e.esgotado && e.variantesBaixas.length > 0 && `; ${e.variantesBaixas.map((v) => `${v.titulo}: ${v.qtd}`).join(", ")}`}
            {!e.esgotado && ")"}
          </li>
        ))}
        {a.promoComFilaAtrasada && <li className="text-atencao">Promoção com a fila da produção atrasada.</li>}
        {a.temPrazoParaPreencher && fila && (
          <li className="text-ink/80">
            Tem [PRAZO REAL] no texto: hoje seria &ldquo;{textoPrazo(fila.prazoRealDiasUteis)}&rdquo;.
          </li>
        )}
      </ul>
    </li>
  );
}

export async function AvisosCalendario() {
  const { fila, avisos, erro } = await avisosProximos();
  if (erro) return <p className="rounded-xl bg-atencao-soft px-4 py-2.5 text-xs text-atencao">{erro}</p>;
  if (!fila) return null;
  return (
    <section aria-label="Avisos de estoque e produção" className="flex flex-col gap-3">
      <Fila fila={fila} />
      {avisos.length > 0 && (
        <details className="rounded-2xl border border-border bg-card px-4 py-3" open={avisos.length <= 4}>
          <summary className="cursor-pointer text-sm font-semibold text-ink">
            {avisos.length} {avisos.length === 1 ? "post dos próximos 30 dias precisa" : "posts dos próximos 30 dias precisam"} de atenção
          </summary>
          <ul className="mt-2">
            {avisos.map((a) => (
              <Linha key={a.conteudoId} a={a} fila={fila} />
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

type ConteudoFicha = Parameters<typeof avisosDosConteudos>[0][number] & { arquivadoEm: Date | null };

export async function AvisosDoConteudo({ c }: { c: ConteudoFicha }) {
  if (c.arquivadoEm || c.status === "publicado") return null;
  const { fila, avisos, erro } = await avisosDosConteudos([c]);
  if (erro) return <p className="rounded-xl bg-atencao-soft px-4 py-2.5 text-xs text-atencao">{erro}</p>;
  const a = avisos[0];
  if (!fila || !a) return null;
  return (
    <section aria-label="Avisos deste post" className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
      <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">Antes de postar</h3>
      <ul>
        <Linha a={a} fila={fila} />
      </ul>
      {(a.promoComFilaAtrasada || a.temPrazoParaPreencher) && <Fila fila={fila} />}
      {a.temPrazoParaPreencher && <CopiarTexto texto={textoPrazo(fila.prazoRealDiasUteis)} rotulo="Copiar prazo" />}
    </section>
  );
}
