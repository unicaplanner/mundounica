import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AcoesConteudo, CopiarTexto } from "@/components/marketing/Acoes";
import { CANAIS, STATUS } from "@/lib/marketing/rotulos";
import { dataLonga, diaISO } from "@/lib/marketing/datas";

export const dynamic = "force-dynamic";

type Cena = { cena?: string; fala?: string; tela?: string; imagem?: string };

function Bloco({ titulo, children, acao }: { titulo: string; children: React.ReactNode; acao?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">{titulo}</h3>
        {acao}
      </div>
      {children}
    </section>
  );
}

const linhas = (t: string) => t.split("\n").map((l) => l.trim()).filter(Boolean);

export default async function ConteudoPage({ params }: PageProps<"/marketing/conteudo/[id]">) {
  const { id } = await params;
  const c = await prisma.mktConteudo.findUnique({
    where: { id },
    include: {
      lote: { select: { numero: true, pastaDriveUrl: true } },
      tarefas: { where: { feita: false }, select: { id: true, titulo: true } },
    },
  });
  if (!c) notFound();

  const origem = c.reaproveita
    ? await prisma.mktConteudo.findUnique({ where: { codigo: c.reaproveita }, select: { id: true, titulo: true, formato: true } })
    : null;
  const roteiro = Array.isArray(c.roteiro) ? (c.roteiro as Cena[]) : [];
  const textoRoteiro = roteiro
    .map((r, i) => [`${i + 1}. ${r.cena ?? ""}`, r.fala && `Fala: ${r.fala}`, r.tela && `Na tela: ${r.tela}`, r.imagem && `Imagem: ${r.imagem}`].filter(Boolean).join("\n"))
    .join("\n\n");
  const legendaCompleta = [c.legenda, c.hashtags].filter(Boolean).join("\n\n");

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={`/marketing/calendario?lote=${c.lote.numero}&modo=estrategico#dia-${diaISO(c.data)}`}
        className="text-sm text-muted hover:text-ink"
      >
        ← Calendário · Lote {c.lote.numero}
      </Link>

      <header className="flex flex-col gap-2">
        <span className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          <span className={`rounded-full px-2 py-0.5 ${CANAIS[c.canal].chip}`}>{CANAIS[c.canal].rotulo}</span>
          <span className="text-muted">{c.formato}</span>
          {c.nivel === "extra" && <span className="rounded-full border border-dashed border-muted px-2 py-0.5 text-muted">extra</span>}
          <span className={`rounded-full px-2 py-0.5 ${STATUS[c.status].chip}`}>{STATUS[c.status].rotulo}</span>
        </span>
        <h2 className="font-serif text-2xl font-semibold text-ink">{c.titulo}</h2>
        <p className="text-sm text-muted first-letter:uppercase">
          {dataLonga(c.data)}
          {c.horario && ` · ${c.horario}`}
          {c.pilar && ` · ${c.pilar}`}
          {c.campanha && ` · ${c.campanha}`}
        </p>
      </header>

      <section className="flex flex-col gap-3 rounded-2xl border border-ink/20 bg-accent-soft p-4 sm:p-5">
        {c.status === "ajustar" && c.notaLari && (
          <p className="text-sm text-alerta">
            Você pediu: “{c.notaLari}”. Eu reescrevo e o roteiro volta pra sua aprovação.
          </p>
        )}
        {c.status === "publicado" && c.linkPublicado && (
          <a href={c.linkPublicado} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-ink underline">
            Ver o post publicado ↗
          </a>
        )}
        <AcoesConteudo id={c.id} status={c.status} />
      </section>

      {origem && (
        <p className="text-sm text-muted">
          Reaproveita o vídeo de{" "}
          <Link href={`/marketing/conteudo/${origem.id}`} className="font-semibold text-ink underline">
            {origem.formato}: {origem.titulo}
          </Link>
          . Não precisa gravar de novo.
        </p>
      )}

      {(c.objetivo || c.gancho) && (
        <Bloco titulo="Ideia">
          {c.objetivo && <p className="text-sm text-ink">{c.objetivo}</p>}
          {c.gancho && (
            <p className="text-base font-semibold text-ink">
              <span className="mr-1 text-xs font-semibold text-muted uppercase">Gancho</span>“{c.gancho}”
            </p>
          )}
        </Bloco>
      )}

      {roteiro.length > 0 && (
        <Bloco titulo="Roteiro" acao={<CopiarTexto texto={textoRoteiro} rotulo="Copiar roteiro" />}>
          <ol className="flex flex-col gap-3">
            {roteiro.map((r, i) => (
              <li key={i} className="grid grid-cols-[1.75rem_1fr] gap-2 border-t border-border-soft pt-3 first:border-0 first:pt-0">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-ink">{i + 1}</span>
                <div className="flex flex-col gap-1 text-sm">
                  {r.cena && <p className="font-semibold text-ink">{r.cena}</p>}
                  {r.fala && (
                    <p className="text-ink">
                      <span className="text-xs font-semibold text-muted">Você fala: </span>
                      {r.fala}
                    </p>
                  )}
                  {r.tela && (
                    <p className="text-ink">
                      <span className="text-xs font-semibold text-muted">Texto na tela: </span>
                      {r.tela}
                    </p>
                  )}
                  {r.imagem && (
                    <p className="text-muted">
                      <span className="text-xs font-semibold">Imagem: </span>
                      {r.imagem}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Bloco>
      )}

      {c.legenda && (
        <Bloco titulo={c.canal === "email" ? "Texto do e-mail" : "Legenda"} acao={<CopiarTexto texto={legendaCompleta} />}>
          <p className="text-sm whitespace-pre-line text-ink">{c.legenda}</p>
          {c.hashtags && <p className="text-sm text-muted">{c.hashtags}</p>}
        </Bloco>
      )}

      {c.cta && (
        <Bloco titulo="Chamada (CTA)">
          <p className="text-sm text-ink">{c.cta}</p>
        </Bloco>
      )}

      {c.producao && (
        <Bloco
          titulo="O que gravar / fotografar"
          acao={
            c.lote.pastaDriveUrl ? (
              <a href={c.lote.pastaDriveUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-ink underline">
                Pasta do Drive ↗
              </a>
            ) : undefined
          }
        >
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-ink">
            {linhas(c.producao).map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </Bloco>
      )}

      {c.produtos && (
        <Bloco titulo="Produtos que aparecem">
          <p className="text-sm text-ink">{c.produtos}</p>
        </Bloco>
      )}

      {c.observacao && (
        <Bloco titulo="Observações">
          <p className="text-sm whitespace-pre-line text-ink">{c.observacao}</p>
        </Bloco>
      )}

      {c.tarefas.length > 0 && (
        <Bloco titulo="Tarefas ligadas a este conteúdo">
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
            {c.tarefas.map((t) => (
              <li key={t.id}>
                <Link href="/marketing/tarefas" className="text-ink underline">
                  {t.titulo}
                </Link>
              </li>
            ))}
          </ul>
        </Bloco>
      )}
    </div>
  );
}
