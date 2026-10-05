import Link from "next/link";
import { carregarEnvio } from "@/lib/financeiro/envio";
import { getMateriais } from "@/lib/financeiro/queries";
import { formatarReais } from "@/lib/financeiro/formato";
import { EnvioCabecalho, NovoEnvio } from "@/components/financeiro/EnvioCabecalho";
import { FichaTecnicaEditor } from "@/components/financeiro/FichaTecnicaEditor";
import { ImpressaoEditor } from "@/components/financeiro/ImpressaoEditor";

export const dynamic = "force-dynamic";

const pct = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

export default async function EnvioPage() {
  const [envio, materiais] = await Promise.all([carregarEnvio(), getMateriais()]);

  const listaMateriais = materiais.map((m) => ({
    id: m.id,
    nome: m.nome,
    unidade: m.unidade,
    custoAtual: m.custoAtual.toNumber(),
  }));
  const somaFora = envio.tipos.length > 0 && Math.abs(envio.percentualTotal - 100) > 0.01;
  const incompletas = envio.tipos.filter((t) => t.incompleto && t.percentual > 0).map((t) => t.nome);

  return (
    <div className="space-y-8">
      <p className="max-w-2xl text-sm text-muted">
        O que vai em cada <strong>pedido</strong>, não importa quantos produtos ele tem: caixa, papel de seda, mimos de
        unboxing e etiqueta. O que vai em cada produto (saquinho, embalagem própria de um kit) fica na ficha do produto.
        Os itens são materiais comuns: registre as compras em{" "}
        <Link href="/financeiro/compras" className="text-ink underline">
          Compras
        </Link>{" "}
        e o custo atualiza sozinho. O link de compra de cada material fica em{" "}
        <Link href="/financeiro/materiais" className="text-ink underline">
          Materiais
        </Link>
        .
      </p>

      {envio.tipos.length > 0 && (
        <div className="rounded-2xl bg-ink px-6 py-5 text-background">
          <p className="text-xs uppercase tracking-wide text-background/60">Custo médio por pedido</p>
          <p className="font-serif text-3xl font-semibold">
            {envio.custoMedio !== null ? formatarReais(envio.custoMedio) : "—"}
          </p>
          {envio.ticket !== null ? (
            <p className="mt-1 text-sm text-background/80">
              Seu pedido médio é de {formatarReais(envio.ticket)} (últimos 12 meses)
              {envio.envioPct !== null && (
                <>
                  : a embalagem é <strong>{pct(envio.envioPct)}</strong> de cada venda e já entra no preço sugerido.
                </>
              )}
            </p>
          ) : (
            <p className="mt-1 text-sm text-background/80">
              Clique em <strong>Atualizar produtos e vendas do Shopify</strong> na aba Produtos pra saber o valor médio
              dos seus pedidos e incluir a embalagem no preço sugerido.
            </p>
          )}
          {incompletas.length > 0 && (
            <p className="mt-3 text-xs text-accent">
              Ainda incompleto: {incompletas.join(", ")}. Enquanto faltar material, compra ou páginas da impressora, o custo
              médio fica menor do que é.
            </p>
          )}
          {somaFora && (
            <p className="mt-3 text-xs text-accent">
              Os % dos pedidos somam {pct(envio.percentualTotal)}, não 100%. A conta usa a proporção entre eles, mas vale
              conferir.
            </p>
          )}
        </div>
      )}

      {envio.tipos.map((t) => {
        const links = t.materiais.filter((m) => m.material.linkCompra);
        return (
          <section key={t.id} className="space-y-5 rounded-2xl border border-border bg-card px-5 py-5">
            <EnvioCabecalho
              id={t.id}
              nome={t.nome}
              quando={t.quando}
              percentual={t.percentual}
              custo={t.custo}
              incompleto={t.incompleto}
            />
            <div>
              <h3 className="mb-2 text-sm font-semibold text-ink">Materiais</h3>
              <FichaTecnicaEditor
                baseUrl={`/api/financeiro/envios/${t.id}`}
                por="pedido"
                itens={t.materiais}
                materiais={listaMateriais}
                textoVazio="Nenhum material ainda. Adicione a caixa, o papel de seda, os mimos (adesivo, guia) e a etiqueta."
                rotuloTotal="Materiais por pedido"
              />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-ink">Impressão</h3>
              <p className="mb-3 text-xs text-muted">
                Folhas impressas que vão no pedido, como as folhas de bloco pra experimentar e o guia.
              </p>
              <ImpressaoEditor baseUrl={`/api/financeiro/envios/${t.id}`} por="pedido" itens={t.impressoes} custoFolha={envio.custoFolha} impressora={envio.impressora} />
            </div>
            {links.length > 0 && (
              <p className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted">
                <span>Onde comprar:</span>
                {links.map((m) => (
                  <a
                    key={m.id}
                    href={m.material.linkCompra!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink underline"
                  >
                    {m.material.nome} ↗
                  </a>
                ))}
              </p>
            )}
          </section>
        );
      })}

      <NovoEnvio vazio={envio.tipos.length === 0} />
    </div>
  );
}
