import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { normalizarVariante } from "./formato";

// Confere que a variante existe e e do produto. null = composicao do produto inteiro.
export async function varianteDoProduto(produtoId: string, varianteId: unknown) {
  if (varianteId === null || varianteId === undefined || varianteId === "") return { ok: true as const, varianteId: null };
  const variante = await prisma.variante.findFirst({
    where: { id: String(varianteId), produtoId },
    select: { id: true },
  });
  return variante ? { ok: true as const, varianteId: variante.id } : { ok: false as const };
}

// Substitui a composicao (materiais, impressao, produtos do kit e custo de compra) de
// cada variante de destino por uma copia da origem. origemVarianteId nulo
// copia a composicao do produto inteiro.
export async function copiarComposicao(
  tx: Prisma.TransactionClient,
  produtoId: string,
  origemVarianteId: string | null,
  destinoVarianteIds: string[]
) {
  const [ficha, impressao, kit, origem] = await Promise.all([
    tx.fichaTecnicaItem.findMany({ where: { produtoId, varianteId: origemVarianteId } }),
    tx.impressaoItem.findMany({ where: { produtoId, varianteId: origemVarianteId } }),
    tx.kitItem.findMany({ where: { kitProdutoId: produtoId, kitVarianteId: origemVarianteId } }),
    origemVarianteId
      ? tx.variante.findUniqueOrThrow({ where: { id: origemVarianteId }, select: { custoCompra: true } })
      : tx.produto.findUniqueOrThrow({ where: { id: produtoId }, select: { custoCompra: true } }),
  ]);

  await tx.fichaTecnicaItem.deleteMany({ where: { produtoId, varianteId: { in: destinoVarianteIds } } });
  await tx.impressaoItem.deleteMany({ where: { produtoId, varianteId: { in: destinoVarianteIds } } });
  await tx.kitItem.deleteMany({ where: { kitProdutoId: produtoId, kitVarianteId: { in: destinoVarianteIds } } });

  await tx.fichaTecnicaItem.createMany({
    data: destinoVarianteIds.flatMap((varianteId) =>
      ficha.map((f) => ({ produtoId, varianteId, materialId: f.materialId, quantidade: f.quantidade }))
    ),
  });
  await tx.impressaoItem.createMany({
    data: destinoVarianteIds.flatMap((varianteId) =>
      impressao.map((i) => ({ produtoId, varianteId, impressoraId: i.impressoraId, folhas: i.folhas }))
    ),
  });
  await tx.kitItem.createMany({
    data: destinoVarianteIds.flatMap((kitVarianteId) =>
      kit.map((k) => ({
        kitProdutoId: produtoId,
        kitVarianteId,
        componenteVarianteId: k.componenteVarianteId,
        quantidade: k.quantidade,
      }))
    ),
  });
  await tx.variante.updateMany({
    where: { id: { in: destinoVarianteIds }, produtoId },
    data: { custoCompra: origem.custoCompra },
  });
}

export type ResultadoModelo = { titulo: string; aplicado: boolean; motivo?: string; variantesSemPar?: string[] };

// Usa a composicao de um produto (origem) como modelo pra outros: cada
// destino fica com o mesmo tipo e uma copia da composicao, substituindo a que
// tinha. Se a origem tem custo por variante, cada variante do destino copia a
// variante da origem com o mesmo nome (ex: "A5 Argolado"); as que nao tem par
// ficam sem composicao e voltam no resultado.
export async function aplicarModelo(origemId: string, destinoIds: string[]): Promise<ResultadoModelo[]> {
  const origem = await prisma.produto.findUnique({
    where: { id: origemId },
    include: {
      variantes: { where: { ativa: true } },
      fichaTecnica: true,
      impressoes: true,
      componentes: { include: { componente: { select: { produtoId: true } } } },
    },
  });
  if (!origem || !origem.tipo || origem.tipo === "ignorar") throw new Error("O produto modelo precisa estar classificado.");

  const destinos = await prisma.produto.findMany({
    where: { id: { in: destinoIds.filter((id) => id !== origemId) } },
    include: {
      variantes: { where: { ativa: true } },
      _count: { select: { variantes: { where: { usadaEmKits: { some: {} } } } } },
    },
  });

  const variantePorNome = new Map(origem.variantes.map((v) => [normalizarVariante(v.title), v]));
  const produtosNoKit = new Set(origem.componentes.map((k) => k.componente.produtoId));
  const doDono = <T extends { varianteId?: string | null; kitVarianteId?: string | null }>(itens: T[], varianteId: string | null) =>
    itens.filter((i) => (i.varianteId ?? i.kitVarianteId ?? null) === varianteId);

  const resultados: ResultadoModelo[] = [];
  for (const destino of destinos) {
    if (origem.tipo === "kit" && destino._count.variantes > 0) {
      resultados.push({ titulo: destino.title, aplicado: false, motivo: "está dentro de um kit, e kit não entra em kit" });
      continue;
    }
    if (origem.tipo === "kit" && produtosNoKit.has(destino.id)) {
      resultados.push({ titulo: destino.title, aplicado: false, motivo: "faz parte do próprio kit modelo" });
      continue;
    }

    // dono = de onde copiar (variante da origem ou o produto inteiro) -> para onde
    const pares: { de: string | null; para: string | null; custoCompra: Prisma.Decimal | null }[] = [];
    const semPar: string[] = [];
    if (origem.custoPorVariante) {
      for (const v of destino.variantes) {
        const par = variantePorNome.get(normalizarVariante(v.title));
        if (par) pares.push({ de: par.id, para: v.id, custoCompra: par.custoCompra });
        else semPar.push(v.title);
      }
    } else {
      pares.push({ de: null, para: null, custoCompra: origem.custoCompra });
    }

    await prisma.$transaction(async (tx) => {
      await tx.fichaTecnicaItem.deleteMany({ where: { produtoId: destino.id } });
      await tx.impressaoItem.deleteMany({ where: { produtoId: destino.id } });
      await tx.kitItem.deleteMany({ where: { kitProdutoId: destino.id } });
      await tx.variante.updateMany({ where: { produtoId: destino.id }, data: { custoCompra: null } });
      await tx.produto.update({
        where: { id: destino.id },
        data: {
          tipo: origem.tipo,
          custoPorVariante: origem.custoPorVariante,
          custoCompra: origem.custoPorVariante ? null : origem.custoCompra,
        },
      });

      for (const { de, para, custoCompra } of pares) {
        await tx.fichaTecnicaItem.createMany({
          data: doDono(origem.fichaTecnica, de).map((f) => ({
            produtoId: destino.id,
            varianteId: para,
            materialId: f.materialId,
            quantidade: f.quantidade,
          })),
        });
        await tx.impressaoItem.createMany({
          data: doDono(origem.impressoes, de).map((i) => ({
            produtoId: destino.id,
            varianteId: para,
            impressoraId: i.impressoraId,
            folhas: i.folhas,
          })),
        });
        await tx.kitItem.createMany({
          data: doDono(origem.componentes, de).map((k) => ({
            kitProdutoId: destino.id,
            kitVarianteId: para,
            componenteVarianteId: k.componenteVarianteId,
            quantidade: k.quantidade,
          })),
        });
        if (para && custoCompra) await tx.variante.update({ where: { id: para }, data: { custoCompra } });
      }
    });

    resultados.push({ titulo: destino.title, aplicado: true, variantesSemPar: semPar });
  }
  return resultados;
}

// Ao passar a ter custo por variante, cada variante que ainda nao tem
// composicao propria comeca com uma copia da composicao do produto -- ai so
// precisa ajustar o que muda (ex: o tamanho do papel).
export async function preencherVariantesVazias(tx: Prisma.TransactionClient, produtoId: string, varianteIds: string[]) {
  const [comFicha, comImpressao, comKit, comCusto] = await Promise.all([
    tx.fichaTecnicaItem.findMany({ where: { produtoId, varianteId: { not: null } }, select: { varianteId: true } }),
    tx.impressaoItem.findMany({ where: { produtoId, varianteId: { not: null } }, select: { varianteId: true } }),
    tx.kitItem.findMany({ where: { kitProdutoId: produtoId, kitVarianteId: { not: null } }, select: { kitVarianteId: true } }),
    tx.variante.findMany({ where: { produtoId, custoCompra: { not: null } }, select: { id: true } }),
  ]);
  const jaTem = new Set([
    ...comFicha.map((f) => f.varianteId),
    ...comImpressao.map((i) => i.varianteId),
    ...comKit.map((k) => k.kitVarianteId),
    ...comCusto.map((v) => v.id),
  ]);
  const vazias = varianteIds.filter((vid) => !jaTem.has(vid));
  if (vazias.length > 0) await copiarComposicao(tx, produtoId, null, vazias);
}

export type ResultadoMaterial = { titulo: string; aplicado: boolean; motivo?: string; onde?: string };

// Coloca um material (ex: o saquinho) na composicao de varios produtos de uma
// vez, so nas variantes escolhidas. Se o produto tem composicao unica e nem
// todas as variantes foram escolhidas (ex: so a A5 leva o saco 15x25), ele
// passa a ter custo por variante, cada variante comecando com a composicao
// que ja tinha. Revenda, kit e "nao contar" ficam de fora; produto sem tipo
// vira producao propria se classificar = true.
export async function aplicarMaterial(
  materialId: string,
  quantidade: Prisma.Decimal,
  alvos: { produtoId: string; varianteIds: string[] }[],
  classificar: boolean
): Promise<ResultadoMaterial[]> {
  const produtos = await prisma.produto.findMany({
    where: { id: { in: alvos.map((a) => a.produtoId) } },
    include: { variantes: { where: { ativa: true }, select: { id: true, title: true } } },
  });
  const porId = new Map(produtos.map((p) => [p.id, p]));
  const resultados: ResultadoMaterial[] = [];

  for (const alvo of alvos) {
    const produto = porId.get(alvo.produtoId);
    if (!produto) continue;
    if (produto.tipo && produto.tipo !== "producao_propria") {
      resultados.push({ titulo: produto.title, aplicado: false, motivo: "não é produção própria" });
      continue;
    }
    if (!produto.tipo && !classificar) {
      resultados.push({ titulo: produto.title, aplicado: false, motivo: "ainda sem classificação" });
      continue;
    }
    const ativas = produto.variantes.map((v) => v.id);
    const escolhidas = alvo.varianteIds.filter((id) => ativas.includes(id));
    if (escolhidas.length === 0) {
      resultados.push({ titulo: produto.title, aplicado: false, motivo: "nenhuma variante escolhida" });
      continue;
    }
    const todas = escolhidas.length === ativas.length;

    await prisma.$transaction(async (tx) => {
      const viraPorVariante = !produto.custoPorVariante && !todas;
      await tx.produto.update({
        where: { id: produto.id },
        data: { tipo: "producao_propria", ...(viraPorVariante ? { custoPorVariante: true } : {}) },
      });
      if (viraPorVariante) await preencherVariantesVazias(tx, produto.id, ativas);

      const donos: (string | null)[] = produto.custoPorVariante || viraPorVariante ? escolhidas : [null];
      for (const varianteId of donos) {
        const existente = await tx.fichaTecnicaItem.findFirst({
          where: { produtoId: produto.id, varianteId, materialId },
          select: { id: true },
        });
        if (existente) await tx.fichaTecnicaItem.update({ where: { id: existente.id }, data: { quantidade } });
        else await tx.fichaTecnicaItem.create({ data: { produtoId: produto.id, varianteId, materialId, quantidade } });
      }
    });

    const nomes = produto.variantes.filter((v) => escolhidas.includes(v.id)).map((v) => v.title);
    resultados.push({ titulo: produto.title, aplicado: true, onde: todas ? "todas as variantes" : nomes.join(", ") });
  }
  return resultados;
}
