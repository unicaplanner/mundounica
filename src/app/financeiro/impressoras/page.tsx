import { getImpressoras } from "@/lib/financeiro/queries";
import { custoAnualImpressora, custoPorFolha, custoPorPagina } from "@/lib/financeiro/impressao";
import { formatarReais, paraCampo } from "@/lib/financeiro/formato";
import { TabelaEditavel } from "@/components/financeiro/TabelaEditavel";

export const dynamic = "force-dynamic";

export default async function ImpressorasPage() {
  const impressoras = await getImpressoras();

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm text-muted">
        Custo por página (um lado impresso) = (preço ÷ vida útil + tinta por ano + manutenção por ano) ÷ páginas por
        ano. As páginas por ano você vê no <strong>contador da impressora</strong>: divida o total pelo tempo de uso.
        Nos produtos, toda folha conta <strong>frente e verso</strong>: custo da folha = 2 × custo da página. Sem o
        número de páginas por ano o custo fica em aberto e os produtos aparecem como incompletos.
      </p>

      <TabelaEditavel
        endpoint="/api/financeiro/impressoras"
        nomeItem="esta impressora"
        rotuloAdicionar="Adicionar impressora"
        textoVazio="Nenhuma impressora cadastrada ainda."
        campos={[
          { chave: "nome", rotulo: "Apelido", placeholder: "Guerreira Mãe", largura: "w-36" },
          { chave: "modelo", rotulo: "Modelo", placeholder: "Canon GX6010", largura: "w-32" },
          { chave: "precoCompra", rotulo: "Preço (R$)", placeholder: "4.000", numerico: true, largura: "w-24" },
          { chave: "vidaUtilAnos", rotulo: "Vida útil (anos)", placeholder: "6", numerico: true, largura: "w-20" },
          { chave: "tintaAno", rotulo: "Tinta/ano (R$)", placeholder: "250", numerico: true, largura: "w-24" },
          { chave: "manutencaoAno", rotulo: "Manutenção/ano (R$)", placeholder: "300", numerico: true, largura: "w-24" },
          { chave: "paginasAno", rotulo: "Páginas/ano", placeholder: "12000", numerico: true, largura: "w-24" },
        ]}
        colunasExtras={["Custo/ano", "Custo/página", "Custo/folha (frente e verso)", "Usada em"]}
        linhas={impressoras.map((i) => {
          const anual = custoAnualImpressora(i);
          const pagina = custoPorPagina(i);
          const folha = custoPorFolha(i);
          return {
            id: i.id,
            nome: i.nome,
            valores: {
              nome: i.nome,
              modelo: i.modelo ?? "",
              precoCompra: paraCampo(i.precoCompra.toNumber(), 2),
              vidaUtilAnos: paraCampo(i.vidaUtilAnos.toNumber()),
              tintaAno: paraCampo(i.tintaAno.toNumber(), 2),
              manutencaoAno: paraCampo(i.manutencaoAno.toNumber(), 2),
              paginasAno: i.paginasAno ? String(i.paginasAno) : "",
            },
            exibir: {
              nome: <span className="font-semibold text-ink">{i.nome}</span>,
              modelo: <span className="text-muted">{i.modelo ?? "—"}</span>,
              precoCompra: formatarReais(i.precoCompra.toNumber()),
              vidaUtilAnos: i.vidaUtilAnos.toNumber().toLocaleString("pt-BR"),
              tintaAno: formatarReais(i.tintaAno.toNumber()),
              manutencaoAno: formatarReais(i.manutencaoAno.toNumber()),
              paginasAno: i.paginasAno ? (
                i.paginasAno.toLocaleString("pt-BR")
              ) : (
                <span className="text-xs text-alerta">falta informar</span>
              ),
            },
            extras: [
              anual ? formatarReais(anual.toNumber()) : "—",
              pagina ? formatarReais(pagina.toNumber(), 4) : "—",
              folha ? <span className="font-semibold text-ink">{formatarReais(folha.toNumber(), 4)}</span> : "—",
              i.produtosQueUsam === 0 ? "—" : `${i.produtosQueUsam} ${i.produtosQueUsam === 1 ? "produto" : "produtos"}`,
            ],
          };
        })}
      />
    </div>
  );
}
