import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { carregarCustos, nomeVariante } from "@/lib/financeiro/custo";
import { paraDecimal, paraTexto } from "@/lib/financeiro/valores";
import { paraData } from "@/lib/parcerias/leitura";

type ItemBody = { varianteId?: unknown; descricao?: unknown; quantidade?: unknown; custoUnitario?: unknown };

// Registra o que foi mandado. Produto do catalogo leva o custo atual do
// Financeiro (copiado agora, pra nao mudar depois); item avulso, o custo digitado.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  const { id } = await params;
  const body = await req.json();

  const itensBody: ItemBody[] = Array.isArray(body.itens) ? body.itens : [];
  if (itensBody.length === 0) return erro("Adicione pelo menos um item enviado.");
  const data = paraData(body.data);
  if (data === undefined) return erro("Data inválida.");
  if (String(body.custoFrete ?? "").trim() && !paraDecimal(body.custoFrete)) return erro("Frete inválido.");

  const varianteIds = itensBody.map((i) => paraTexto(i.varianteId, 40)).filter((v): v is string => v !== null);
  const [variantes, custos] = await Promise.all([
    prisma.variante.findMany({ where: { id: { in: varianteIds } }, select: { id: true, title: true, produto: { select: { title: true } } } }),
    varianteIds.length ? carregarCustos() : null,
  ]);
  const porId = new Map(variantes.map((v) => [v.id, v]));

  const itens = [];
  for (const i of itensBody) {
    const varianteId = paraTexto(i.varianteId, 40);
    const variante = varianteId ? porId.get(varianteId) : undefined;
    if (varianteId && !variante) return erro("Um dos produtos não existe mais no catálogo.");
    const descricao = variante ? nomeVariante(variante.produto.title, variante.title) : paraTexto(i.descricao, 200);
    if (!descricao) return erro("Dê um nome pro item avulso.");
    const quantidade = Number(i.quantidade ?? 1);
    if (!Number.isInteger(quantidade) || quantidade < 1) return erro("Quantidade: um número inteiro a partir de 1.");
    const digitado = String(i.custoUnitario ?? "").trim() ? paraDecimal(i.custoUnitario) : null;
    if (String(i.custoUnitario ?? "").trim() && !digitado) return erro(`Custo inválido em "${descricao}".`);
    const custoUnitario = digitado ?? (variante && custos ? (custos.daVariante(variante.id)?.valor.toDecimalPlaces(2) ?? null) : null);
    itens.push({ varianteId: variante?.id ?? null, descricao, quantidade, custoUnitario });
  }

  const criadora = await prisma.criadora.findUnique({ where: { id }, select: { id: true } });
  if (!criadora) return erro("Criadora não encontrada.", 404);

  await prisma.envioParceria.create({
    data: {
      criadoraId: id,
      data: data ?? new Date(),
      rastreio: paraTexto(body.rastreio, 80),
      custoFrete: paraDecimal(body.custoFrete),
      observacao: paraTexto(body.observacao, 1000),
      itens: { create: itens },
    },
  });
  return NextResponse.json({ ok: true });
}
