import type { TipoProduto } from "@prisma/client";
import { CustoCompraForm } from "./CustoCompraForm";
import { ProducaoEditor, type ItemFicha } from "./ProducaoEditor";
import { KitEditor, type CandidatoKit, type ItemKit } from "./KitEditor";

type Material = { id: string; nome: string; unidade: string; custoAtual: number; impresso: boolean };

// O que forma o custo, conforme o tipo: custo de compra (revenda), materiais
// com a impressao do papel (producao propria) ou produtos + embalagem (kit).
// varianteId nulo = composicao do produto inteiro.
export function ComposicaoEditor({
  produtoId,
  varianteId = null,
  tipo,
  custoCompra,
  ficha,
  kit,
  materiais,
  candidatos,
  custoFolha,
  impressora,
  minutos,
  valorHora,
}: {
  produtoId: string;
  varianteId?: string | null;
  tipo: TipoProduto;
  custoCompra: number | null;
  ficha: ItemFicha[];
  kit: ItemKit[];
  materiais: Material[];
  candidatos: CandidatoKit[];
  custoFolha: number | null; // folha impressa, com o custo da impressora mais cara
  impressora: string | null;
  minutos: number | null; // tempo de producao (mao de obra)
  valorHora: number | null;
}) {
  if (tipo === "revenda") {
    return <CustoCompraForm produtoId={produtoId} varianteId={varianteId} custoCompra={custoCompra} />;
  }

  const maoDeObra = {
    minutos,
    valorHora,
    url: varianteId ? `/api/financeiro/variantes/${varianteId}` : `/api/financeiro/produtos/${produtoId}`,
    campo: "minutosProducao",
  };
  const producao = { produtoId, varianteId, itens: ficha, materiais, custoFolha, impressora, maoDeObra };

  if (tipo === "producao_propria") {
    return <ProducaoEditor {...producao} />;
  }

  return (
    <div className="space-y-8">
      <section>
        <h4 className="mb-3 text-sm font-semibold text-ink">Produtos dentro do kit</h4>
        <KitEditor produtoId={produtoId} varianteId={varianteId} itens={kit} candidatos={candidatos} />
      </section>
      <section>
        <h4 className="mb-1 text-sm font-semibold text-ink">Embalagem e extras do kit (opcional)</h4>
        <p className="mb-3 text-xs text-muted">Caixa do kit, fita, cartão, impressão própria… o que vai no kit além dos produtos.</p>
        <ProducaoEditor {...producao} textoVazio="Nenhuma embalagem ou extra ainda." rotuloTotal="Embalagem e extras" />
      </section>
    </div>
  );
}
