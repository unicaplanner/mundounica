import { nomeExibicao } from "@/lib/parcerias/formato";
import { agruparPorEtapa, carregarProducao } from "@/lib/parcerias/producao";
import { PrintCheckbox } from "@/components/imprimir/PrintCheckbox";
import { PrintToolbar } from "@/components/imprimir/PrintToolbar";

export const dynamic = "force-dynamic";

// Lista de producao dos envios em A5: um bloco por etapa, uma linha com
// quadradinho por criadora. Mesmos dados da tela "Produção dos envios".
export default async function ImprimirProducaoPage({ searchParams }: PageProps<"/imprimir/parcerias/producao">) {
  const sp = await searchParams;
  const campanhaId = typeof sp.campanha === "string" ? sp.campanha : undefined;
  const pendentes = (await carregarProducao(campanhaId)).filter((i) => !i.feito);
  const grupos = agruparPorEtapa(pendentes);
  const hoje = new Date().toLocaleDateString("pt-BR");

  return (
    <>
      <PrintToolbar voltarHref="/marketing/parcerias/producao" titulo="Lista de produção dos envios" />
      <main className="mx-auto my-4 max-w-[148mm] bg-white p-[8mm] text-[9pt] leading-tight shadow-[0_2px_10px_rgba(0,0,0,0.15)] print:my-0 print:max-w-none print:p-0 print:shadow-none">
        <header className="mb-3 border-b-[0.4mm] border-black pb-2">
          <h1 className="text-[14pt] font-bold">Produção dos envios</h1>
          <p className="text-[8.5pt]">
            {hoje} · {pendentes.length} itens pendentes
          </p>
        </header>

        {grupos.length === 0 && <p>Nada pendente nos envios. 🎉</p>}

        {grupos.map((g) => (
          <section key={g.valor} className="mb-2">
            <h2 className="flex items-baseline justify-between gap-2 border-b-[0.2mm] border-black pb-0.5 text-[10pt] font-bold break-after-avoid">
              <span>{g.rotulo}</span>
              <span className="shrink-0 text-[9pt]">{g.itens.length} pend.</span>
            </h2>
            <ul>
              {g.itens.map((i) => (
                <li key={i.id} className="flex items-start py-[0.6mm] break-inside-avoid">
                  <PrintCheckbox />
                  <span>
                    <b>{nomeExibicao(i.criadora)}</b>
                    {i.criadora.nome && <> · {i.criadora.nome}</>}
                    {i.criadora.lote ? <> · lote {i.criadora.lote}</> : null} — <span className="italic">{i.texto}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </>
  );
}
