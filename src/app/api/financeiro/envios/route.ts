import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { ENVIOS_PADRAO } from "@/lib/financeiro/envio";
import { paraDecimal, paraTexto } from "@/lib/financeiro/valores";

// Cria um tipo de embalagem de envio, ou ({ padrao: true }) os tres que a
// Lari usa hoje, ja com caixa, seda, adesivo e etiqueta quando esses
// materiais existem (pula as caixas que ja existem com o mesmo nome).
export async function POST(req: Request) {
  if (!(await getUsuario())) return naoAutenticado();
  const body = await req.json();

  if (body.padrao === true) {
    const nomes = [...new Set(ENVIOS_PADRAO.flatMap((e) => e.itens))];
    const materiais = await prisma.material.findMany({ where: { nome: { in: nomes } }, select: { id: true, nome: true } });
    const idDo = new Map(materiais.map((m) => [m.nome, m.id]));

    let criados = 0;
    await prisma.$transaction(async (tx) => {
      for (const [ordem, e] of ENVIOS_PADRAO.entries()) {
        if (await tx.tipoEnvio.findUnique({ where: { nome: e.nome }, select: { id: true } })) continue;
        const tipo = await tx.tipoEnvio.create({ data: { nome: e.nome, quando: e.quando, percentual: e.percentual, ordem } });
        const itens = e.itens.map((nome) => idDo.get(nome)).filter((id): id is string => !!id);
        await tx.envioMaterial.createMany({ data: itens.map((materialId) => ({ tipoEnvioId: tipo.id, materialId, quantidade: 1 })) });
        criados += 1;
      }
    });
    return NextResponse.json({ ok: true, criados });
  }

  const nome = paraTexto(body.nome, 60);
  if (!nome) return erro("Dê um nome pra embalagem, por exemplo Caixa Planner.");
  const percentual = body.percentual === undefined || body.percentual === "" ? new Prisma.Decimal(0) : paraDecimal(body.percentual);
  if (!percentual || percentual.gt(100)) return erro("O % dos pedidos precisa ser um número de 0 a 100.");

  try {
    const ordem = await prisma.tipoEnvio.count();
    const criado = await prisma.tipoEnvio.create({ data: { nome, quando: paraTexto(body.quando, 200), percentual, ordem } });
    return NextResponse.json({ ok: true, id: criado.id });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return erro("Já existe uma embalagem com esse nome.", 409);
    }
    throw e;
  }
}
