import type { TipoProduto } from "@prisma/client";
import { CustoCompraForm } from "./CustoCompraForm";
import { FichaTecnicaEditor } from "./FichaTecnicaEditor";
import { KitEditor, type CandidatoKit, type ItemKit } from "./KitEditor";

type Material = { id: string; nome: string; unidade: string; custoAtual: number };
type ItemFicha = { id: string; quantidade: number; material: Material };

// O que forma o custo, conforme o tipo: custo de compra (revenda), materiais
// (producao propria) ou produtos + embalagem (kit). varianteId nulo =
// composicao do produto inteiro.
export function ComposicaoEditor({
  produtoId,
  varianteId = null,
  tipo,
  custoCompra,
  ficha,
  kit,
  materiais,
  candidatos,
}: {
  produtoId: string;
  varianteId?: string | null;
  tipo: TipoProduto;
  custoCompra: number | null;
  ficha: ItemFicha[];
  kit: ItemKit[];
  materiais: Material[];
  candidatos: CandidatoKit[];
}) {
  if (tipo === "revenda") {
    return <CustoCompraForm produtoId={produtoId} varianteId={varianteId} custoCompra={custoCompra} />;
  }

  if (tipo === "producao_propria") {
    return <FichaTecnicaEditor produtoId={produtoId} varianteId={varianteId} itens={ficha} materiais={materiais} />;
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
    </div>
  );
}
