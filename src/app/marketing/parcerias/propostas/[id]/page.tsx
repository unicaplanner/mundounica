import Link from "next/link";
import { notFound } from "next/navigation";
import type { Recomendacao } from "@prisma/client";
import { prisma } from "@/lib/db";
import { extrairDaDm, lerChecklist } from "@/lib/parcerias/avaliacao";
import { claudeConfigurado } from "@/lib/parcerias/claude";
import { dataBR, nomeExibicao } from "@/lib/parcerias/formato";
import { formatarSeguidores, linkPerfil } from "@/lib/parcerias/perfil";
import { ROTULO_STATUS } from "@/lib/parcerias/rotulos";
import { AvaliacaoProposta } from "@/components/parcerias/AvaliacaoProposta";
import { BotaoAcao } from "@/components/parcerias/BotaoAcao";
import { EditorCampos } from "@/components/parcerias/EditorCampos";

export const dynamic = "force-dynamic";

export default async function PropostaPage({ params }: PageProps<"/marketing/parcerias/propostas/[id]">) {
  const { id } = await params;
  const p = await prisma.propostaUgc.findUnique({ where: { id }, include: { criadora: true } });
  if (!p) notFound();
  const c = p.criadora;
  const extraido = extrairDaDm(p.texto);
  const bruto = (p.checklist ?? {}) as Record<string, unknown>;
  const sugestaoClaude = typeof bruto._claude === "string" ? (bruto._claude as Recomendacao) : null;

  return (
    <div className="space-y-6">
      <Link href="/marketing/parcerias/propostas" className="text-xs text-muted hover:text-ink">
        ← Todas as propostas
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="break-all font-serif text-2xl font-semibold text-ink">Proposta de {nomeExibicao(c)}</h2>
        <Link href={`/marketing/parcerias/criadoras/${c.id}`} className="text-sm text-ink underline">
          ficha dela ({ROTULO_STATUS[c.status]})
        </Link>
        {c.instagram && (
          <a href={linkPerfil("instagram", c.instagram)} target="_blank" rel="noopener noreferrer" className="text-sm text-ink underline">
            abrir Instagram ↗
          </a>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
          <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-ink">DM recebida em {dataBR.format(p.recebidaEm)}</h3>
            <p className="whitespace-pre-line text-sm text-ink">{p.texto}</p>
            {(extraido.links.length > 0 || extraido.arrobas.length > 1 || extraido.email) && (
              <div className="space-y-1 border-t border-border pt-2 text-xs text-muted">
                {extraido.email && <p>E-mail: {extraido.email}</p>}
                {extraido.arrobas.length > 1 && <p>Perfis citados: {extraido.arrobas.map((a) => `@${a}`).join(", ")}</p>}
                {extraido.links.map((l) => (
                  <a key={l} href={l} target="_blank" rel="noopener noreferrer" className="block break-all underline">
                    {l}
                  </a>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
            <EditorCampos
              url={`/api/parcerias/criadoras/${c.id}`}
              titulo="O que você conferiu no perfil"
              vazio="Abra o perfil dela e anote seguidores, nicho e o que viu."
              campos={[
                { chave: "nome", rotulo: "Como chamar", valor: c.nome ?? "", largura: "media" },
                {
                  chave: "seguidoresInstagram",
                  rotulo: "Seguidores no IG",
                  valor: c.seguidoresInstagram === null ? "" : String(c.seguidoresInstagram),
                  exibicao: formatarSeguidores(c.seguidoresInstagram),
                  largura: "curta",
                },
                { chave: "nicho", rotulo: "Nicho", valor: c.nicho ?? "", largura: "inteira" },
                { chave: "observacoes", rotulo: "O que viu no perfil", valor: c.observacoes ?? "", tipo: "area" },
              ]}
            />
          </section>
        </div>

        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <AvaliacaoProposta
            propostaId={p.id}
            checklistInicial={lerChecklist(p.checklist)}
            justificativaInicial={p.justificativa ?? ""}
            perguntasInicial={p.perguntas ?? ""}
            pedidoInicial={p.pedido ?? ""}
            valorInicial={p.valorPedido ? p.valorPedido.toNumber().toFixed(2).replace(".", ",") : ""}
            recomendacao={p.recomendacao}
            sugestaoClaude={sugestaoClaude}
            claudeLigado={claudeConfigurado()}
          />
        </section>
      </div>

      <BotaoAcao
        url={`/api/parcerias/propostas/${p.id}`}
        method="DELETE"
        rotulo="Excluir proposta"
        confirmar="Excluir esta proposta? (a ficha da criadora continua)"
        irPara="/marketing/parcerias/propostas"
        className="text-xs text-muted underline hover:text-alerta"
      />
    </div>
  );
}
