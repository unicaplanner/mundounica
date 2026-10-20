import { prisma } from "@/lib/db";
import { nomeExibicao } from "@/lib/parcerias/formato";
import { ROTULO_ETAPA, ordemDaEtapa } from "@/lib/parcerias/etapas";
import { incluirCriadoraNaProducao, respostasDeProducao } from "@/lib/parcerias/producao";
import { PrintCheckbox } from "@/components/imprimir/PrintCheckbox";
import { PrintToolbar } from "@/components/imprimir/PrintToolbar";

export const dynamic = "force-dynamic";

const MAXIMO = 60;

// Uma ficha A5 por criadora (uma folha cada): pra quem monta a caixa ter na
// mao o endereco, o que vai dentro e o que ela pediu no formulario. Escolha
// as criadoras em "Produção dos envios > Por criadora" (?id=...&id=...).
export default async function ImprimirFichasPage({ searchParams }: PageProps<"/imprimir/parcerias/ficha">) {
  const sp = await searchParams;
  const ids = [sp.id ?? []].flat().filter(Boolean).slice(0, MAXIMO);

  const criadoras = ids.length
    ? await prisma.criadora.findMany({
        where: { id: { in: ids } },
        select: { ...incluirCriadoraNaProducao, producao: { orderBy: { posicao: "asc" } } },
      })
    : [];
  criadoras.sort((a, b) => (a.lote ?? 99) - (b.lote ?? 99) || nomeExibicao(a).localeCompare(nomeExibicao(b)));

  return (
    <>
      <PrintToolbar voltarHref="/marketing/parcerias/producao?ver=criadora" titulo={`${criadoras.length} ficha${criadoras.length === 1 ? "" : "s"} de envio`} />
      <div className="mx-auto my-4 max-w-[148mm] space-y-4 print:my-0 print:max-w-none print:space-y-0">
        {criadoras.length === 0 && (
          <p className="bg-white p-[8mm] text-[10pt]">Nenhuma criadora escolhida. Volte e marque as fichas que quer imprimir.</p>
        )}
        {criadoras.map((c) => {
          const itens = [...c.producao].sort((a, b) => ordemDaEtapa(a.etapa) - ordemDaEtapa(b.etapa) || a.posicao - b.posicao);
          const respostas = respostasDeProducao(c.respostas[0]?.respostas);
          return (
            <main
              key={c.id}
              className="bg-white p-[8mm] text-[9pt] leading-tight shadow-[0_2px_10px_rgba(0,0,0,0.15)] print:p-0 print:shadow-none print:break-after-page print:last:break-after-auto"
            >
              <header className="mb-2 border-b-[0.4mm] border-black pb-1.5">
                <h1 className="text-[14pt] font-bold">{nomeExibicao(c)}</h1>
                <p className="text-[8.5pt]">
                  {[c.nome, c.lote && `Lote ${c.lote}`, c.kit, c.cupom && `cupom ${c.cupom}`].filter(Boolean).join(" · ")}
                </p>
              </header>

              <section className="mb-2">
                <h2 className="border-b-[0.2mm] border-black pb-0.5 text-[10pt] font-bold">Entregar para</h2>
                {c.nomeCompleto || c.endereco || c.whatsapp ? (
                  <p className="whitespace-pre-line pt-0.5">
                    {c.nomeCompleto && <b>{c.nomeCompleto}</b>}
                    {c.endereco && <>{c.nomeCompleto ? "\n" : ""}{c.endereco}</>}
                    {c.whatsapp && <>{"\n"}Telefone: {c.whatsapp}</>}
                  </p>
                ) : (
                  <p className="pt-0.5 italic">Sem endereço na ficha ainda (vem do formulário de permuta).</p>
                )}
              </section>

              <section className="mb-2">
                <h2 className="border-b-[0.2mm] border-black pb-0.5 text-[10pt] font-bold">Preparar</h2>
                {itens.length === 0 && <p className="pt-0.5 italic">Sem lista de produção ainda.</p>}
                <ul>
                  {itens.map((i) => (
                    <li key={i.id} className="flex items-start py-[0.6mm] break-inside-avoid">
                      <PrintCheckbox checked={i.feito} />
                      <span>
                        <b>{ROTULO_ETAPA[i.etapa] ?? i.etapa}</b> — {i.texto}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              {respostas.length > 0 && (
                <section>
                  <h2 className="border-b-[0.2mm] border-black pb-0.5 text-[10pt] font-bold">O que ela pediu no formulário</h2>
                  <dl className="pt-0.5">
                    {respostas.map((r) => (
                      <div key={r.pergunta} className="py-[0.4mm] break-inside-avoid">
                        <dt className="font-bold">{r.pergunta}</dt>
                        <dd>{r.resposta}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}
            </main>
          );
        })}
      </div>
    </>
  );
}
