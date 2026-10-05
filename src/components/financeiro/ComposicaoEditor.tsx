import type { TipoProduto } from "@prisma/client";
import { CustoCompraForm } from "./CustoCompraForm";
import { FichaTecnicaEditor } from "./FichaTecnicaEditor";
import { ImpressaoEditor, type ItemImpressao } from "./ImpressaoEditor";
import { KitEditor, type CandidatoKit, type ItemKit } from "./KitEditor";

type Material = { id: string; nome: string; unidade: string; custoAtual: number };
type ItemFicha = { id: string; quantidade: number; material: Material };

// O que forma o custo, conforme o tipo: custo de compra (revenda), materiais
// + impressao (producao propria) ou produtos + embalagem + impressao (kit).
// varianteId nulo = composicao do produto inteiro.
export function ComposicaoEditor({
  produtoId,
  varianteId = null,
  tipo,
  custoCompra,
  ficha,
  kit,
  impressao,
  materiais,
  candidatos,
  custoFolha,
  impressora,
}: {
  produtoId: string;
  varianteId?: string | null;
  tipo: TipoProduto;
  custoCompra: number | null;
  ficha: ItemFicha[];
  kit: ItemKit[];
  impressao: ItemImpressao[];
  materiais: Material[];
  candidatos: CandidatoKit[];
  custoFolha: number | null; // folha impressa, com o custo da impressora mais cara
  impressora: string | null;
}) {
  if (tipo === "revenda") {
    return <CustoCompraForm produtoId={produtoId} varianteId={varianteId} custoCompra={custoCompra} />;
  }

  const secaoImpressao = (
    <section>
      <h4 className="mb-2 text-sm font-semibold text-ink">Impressão</h4>
      <ImpressaoEditor produtoId={produtoId} varianteId={varianteId} itens={impressao} custoFolha={custoFolha} impressora={impressora} />
    </section>
  );

  if (tipo === "producao_propria") {
    return (
      <div className="space-y-8">
        <section>
          <h4 className="mb-3 text-sm font-semibold text-ink">Materiais</h4>
          <FichaTecnicaEditor produtoId={produtoId} varianteId={varianteId} itens={ficha} materiais={materiais} rotuloTotal="Materiais" />
        </section>
        {secaoImpressao}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h4 className="mb-3 text-sm font-semibold text-ink">Produtos dentro do kit</h4>
        <KitEditor produtoId={produtoId} varianteId={varianteId} itens={kit} candidatos={candidatos} />
      </section>
      <section>
        <h4 className="mb-1 text-sm font-semibold text-ink">Embalagem e extras (opcional)</h4>
        <p className="mb-3 text-xs text-muted">Caixa, fita, cartão, papel de seda… o que vai no kit além dos produtos.</p>
        <FichaTecnicaEditor
          produtoId={produtoId}
          varianteId={varianteId}
          itens={ficha}
          materiais={materiais}
          textoVazio="Nenhuma embalagem ou extra ainda."
          rotuloTotal="Embalagem e extras"
        />
      </section>
      {secaoImpressao}
    </div>
  );
}
