import Link from "next/link";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { dataBR, nomeExibicao } from "@/lib/parcerias/formato";
import type { ItemResposta } from "@/lib/parcerias/formulario";
import { scriptFormulario } from "@/lib/parcerias/script-formulario";
import { BotaoAcao } from "@/components/parcerias/BotaoAcao";
import { Copiar } from "@/components/parcerias/Copiar";
import { LigarResposta } from "@/components/parcerias/LigarResposta";

export const dynamic = "force-dynamic";

export default async function FormularioPage() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "mundounica.vercel.app";
  const protocolo = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const token = process.env.PARCERIAS_FORM_TOKEN?.trim();
  const webhook = `${protocolo}://${host}/api/parcerias/formulario?token=${token ?? "FALTA_CONFIGURAR"}`;

  const [respostas, criadoras] = await Promise.all([
    prisma.respostaFormulario.findMany({
      orderBy: { enviadaEm: "desc" },
      take: 50,
      include: { criadora: { select: { id: true, instagram: true, tiktok: true, youtube: true, nome: true } } },
    }),
    prisma.criadora.findMany({ select: { id: true, instagram: true, tiktok: true, youtube: true, nome: true }, orderBy: { instagram: "asc" } }),
  ]);
  const soltas = respostas.filter((r) => !r.criadoraId);
  const opcoes = criadoras.map((c) => ({ id: c.id, nome: nomeExibicao(c) }));

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="font-serif text-2xl font-semibold text-ink">Formulário de permuta</h2>
        <p className="text-sm text-muted">
          Cada resposta do Google Forms chega aqui sozinha. Pelo @ do Instagram, os dados (nome completo, e-mail, WhatsApp, endereço) vão pra ficha da criadora e ela
          passa pra &quot;Fechou parceria&quot;. As respostas completas ficam guardadas na ficha.
        </p>
      </div>

      {soltas.length > 0 && (
        <section className="space-y-3 rounded-2xl border border-atencao/40 bg-atencao-soft/40 p-4">
          <h3 className="text-sm font-semibold text-atencao">
            {soltas.length} {soltas.length === 1 ? "resposta não achou" : "respostas não acharam"} a criadora pelo @
          </h3>
          <ul className="space-y-4">
            {soltas.map((r) => (
              <li key={r.id} className="space-y-2 rounded-xl bg-card p-3 text-sm">
                <p className="text-ink">
                  <b>{r.instagram ?? "sem @"}</b> · {dataBR.format(r.enviadaEm)}
                </p>
                <p className="line-clamp-2 text-xs text-muted">
                  {(r.respostas as ItemResposta[])
                    .slice(0, 5)
                    .map((i) => i.resposta)
                    .join(" · ")}
                </p>
                <LigarResposta respostaId={r.id} criadoras={opcoes} />
                <BotaoAcao
                  url={`/api/parcerias/respostas/${r.id}`}
                  method="DELETE"
                  rotulo="Descartar"
                  confirmar="Descartar esta resposta?"
                  className="text-xs text-muted underline hover:text-alerta"
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        <h3 className="font-serif text-xl font-semibold text-ink">Últimas respostas</h3>
        {respostas.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma resposta recebida ainda. Configure o envio automático abaixo.</p>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {respostas.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                <span className="w-24 text-xs tabular-nums text-muted">{dataBR.format(r.enviadaEm)}</span>
                {r.criadora ? (
                  <Link href={`/marketing/parcerias/criadoras/${r.criadora.id}`} className="font-semibold text-ink hover:underline">
                    {nomeExibicao(r.criadora)}
                  </Link>
                ) : (
                  <span className="text-atencao">{r.instagram ?? "sem @"} (não ligada)</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h3 className="font-serif text-xl font-semibold text-ink">Ligar o envio automático (uma vez só)</h3>
        {!token && (
          <p className="rounded-xl bg-alerta-soft px-4 py-3 text-sm text-alerta">
            Falta a senha do formulário: na Vercel, crie a variável <code>PARCERIAS_FORM_TOKEN</code> com um texto longo e aleatório e faça um novo deploy.
          </p>
        )}
        <ol className="list-decimal space-y-2 pl-5 text-sm text-ink">
          <li>Abra a planilha de respostas do formulário de permuta (no Forms: Respostas → ícone do Planilhas).</li>
          <li>
            Na planilha: <b>Extensões → Apps Script</b>. Apague o que estiver lá e cole o código abaixo. Salve (ícone de disquete).
          </li>
          <li>
            No menu da esquerda, <b>Acionadores</b> (relógio) → <b>Adicionar acionador</b>: função <code>aoEnviarFormulario</code>, evento{" "}
            <b>Da planilha → Ao enviar o formulário</b>. Salve e autorize com a sua conta Google.
          </li>
          <li>
            Pra trazer as respostas que já existem: volte ao editor, escolha <code>enviarTodasAsRespostas</code> no menu de funções e clique em <b>Executar</b>.
          </li>
        </ol>
        <p className="text-xs text-muted">O formulário precisa ter uma pergunta com &quot;Instagram&quot; ou &quot;@&quot; no texto — é por ela que a resposta acha a criadora.</p>
        <div className="space-y-2">
          <Copiar texto={scriptFormulario(webhook)} rotulo="Copiar código do Apps Script" />
          <pre className="max-h-72 overflow-auto rounded-xl bg-ink p-3 text-[11px] leading-relaxed text-background">{scriptFormulario(webhook)}</pre>
        </div>
        <p className="text-xs text-muted">O código tem a senha do sistema no endereço: não compartilhe a planilha com edição pra quem não é da Unica.</p>
      </section>
    </div>
  );
}
