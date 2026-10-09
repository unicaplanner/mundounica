import Link from "next/link";
import { getFornecedores, linkWhatsapp } from "@/lib/financeiro/fornecedores";
import { formatarReais } from "@/lib/financeiro/formato";

export const dynamic = "force-dynamic";

const dataBR = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" });

export default async function FornecedoresPage() {
  const fornecedores = await getFornecedores();

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm text-muted">
        Os fornecedores aparecem aqui sozinhos quando você lança uma compra com o nome deles. Clique pra ver a ficha: últimas
        compras, como o preço mudou, o que vocês compram, mensagens importantes e o WhatsApp.
      </p>
      {fornecedores.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted">
          Nenhum fornecedor ainda. Preencha o fornecedor ao lançar uma compra em{" "}
          <Link href="/financeiro/compras" className="text-ink underline">
            Compras
          </Link>
          .
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm [&_td]:pr-4 [&_th]:pr-4">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="py-2 font-semibold">Fornecedor</th>
                <th className="py-2 text-right font-semibold">Compras</th>
                <th className="py-2 text-right font-semibold">Total gasto</th>
                <th className="py-2 font-semibold">Última compra</th>
                <th className="py-2 font-semibold">WhatsApp</th>
              </tr>
            </thead>
            <tbody>
              {fornecedores.map((f) => {
                const wa = linkWhatsapp(f.whatsapp);
                return (
                  <tr key={f.id} className="border-b border-border">
                    <td className="py-2.5">
                      <Link href={`/financeiro/fornecedores/${f.id}`} className="font-semibold text-ink hover:underline">
                        {f.nome}
                      </Link>
                    </td>
                    <td className="py-2.5 text-right tabular-nums">{f.compras}</td>
                    <td className="py-2.5 text-right tabular-nums">{formatarReais(f.totalGasto)}</td>
                    <td className="py-2.5 text-muted">{f.ultimaCompra ? dataBR.format(f.ultimaCompra) : "—"}</td>
                    <td className="py-2.5">
                      {wa ? (
                        <a href={wa} target="_blank" rel="noopener noreferrer" className="text-xs text-ok underline">
                          abrir conversa ↗
                        </a>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
