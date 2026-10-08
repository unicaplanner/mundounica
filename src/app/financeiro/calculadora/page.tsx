import { getImpressoras, getMateriais } from "@/lib/financeiro/queries";
import { carregarParametros } from "@/lib/financeiro/precificacao";
import { carregarMei } from "@/lib/financeiro/mei";
import { impressoraPadrao } from "@/lib/financeiro/impressao";
import { CalculadoraPreco } from "@/components/financeiro/CalculadoraPreco";

export const dynamic = "force-dynamic";

export default async function CalculadoraPage() {
  const [materiais, impressoras, parametros, mei] = await Promise.all([
    getMateriais(),
    getImpressoras(),
    carregarParametros(),
    carregarMei(),
  ]);
  const padrao = impressoraPadrao(impressoras);

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm text-muted">
        Orce rápido um produto novo ou uma encomenda personalizada, sem cadastrar nada. Os custos dos materiais, da
        impressão, da sua hora, da embalagem e das taxas vêm do que já está no sistema.
      </p>
      <CalculadoraPreco
        materiais={materiais.map((m) => ({
          id: m.id,
          nome: m.nome,
          unidade: m.unidade,
          custoAtual: m.custoAtual.toNumber(),
          impresso: m.impresso,
        }))}
        parametros={{
          fixosPct: parametros.fixosPct,
          despesasPct: parametros.despesasPct,
          lucroPct: parametros.lucroPct,
          envioPorProduto: parametros.envioPorProduto,
          despesas: parametros.despesas,
          margens: parametros.margens,
          totalFixos: parametros.totalFixos,
        }}
        custoFolha={padrao?.custoFolha.toNumber() ?? null}
        valorHora={parametros.valorHora}
        envioPorPedido={parametros.custoMedioEnvio}
        meiPct={mei.pctVendido}
      />
    </div>
  );
}
