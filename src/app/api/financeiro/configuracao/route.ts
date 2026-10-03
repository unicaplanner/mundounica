import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { paraDecimal } from "@/lib/financeiro/valores";

// Faturamento medio mensal (base do rateio dos fixos) e lucro desejado.
export async function PATCH(req: Request) {
  if (!(await getUsuario())) return naoAutenticado();
  const body = await req.json();

  let faturamento: Prisma.Decimal | null | undefined;
  if ("faturamentoMensal" in body) {
    if (body.faturamentoMensal === null || body.faturamentoMensal === "") {
      faturamento = null;
    } else {
      faturamento = paraDecimal(body.faturamentoMensal);
      if (!faturamento || faturamento.isZero()) {
        return erro("Informe o faturamento médio por mês, por exemplo 6.355,87.");
      }
    }
  }

  let lucro: Prisma.Decimal | undefined;
  if ("lucroDesejado" in body) {
    const valor = paraDecimal(body.lucroDesejado);
    if (!valor || valor.gte(100)) return erro("O lucro desejado precisa ser um percentual entre 0 e 99.");
    lucro = valor;
  }

  const campos = {
    ...(faturamento !== undefined ? { faturamentoMensal: faturamento } : {}),
    ...(lucro ? { lucroDesejado: lucro } : {}),
  };
  await prisma.configuracaoPrecificacao.upsert({
    where: { id: "unica" },
    create: { id: "unica", ...campos },
    update: campos,
  });

  return NextResponse.json({ ok: true });
}
