import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { paraDecimal } from "@/lib/financeiro/valores";

// Faturamento medio mensal (base do rateio dos fixos), lucro desejado e valor da hora de producao.
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

  let valorHora: Prisma.Decimal | null | undefined;
  if ("valorHora" in body) {
    if (body.valorHora === null || body.valorHora === "") valorHora = null;
    else {
      valorHora = paraDecimal(body.valorHora);
      if (!valorHora || valorHora.isZero()) return erro("Informe o valor da hora, por exemplo 15,00.");
    }
  }

  const margens: Record<string, Prisma.Decimal> = {};
  for (const chave of ["margemProducao", "margemRevenda", "margemKit"]) {
    if (!(chave in body)) continue;
    const valor = paraDecimal(body[chave]);
    if (!valor || valor.gte(95)) return erro("A meta de margem precisa ser um percentual entre 0 e 94.");
    margens[chave] = valor;
  }

  const campos = {
    ...(faturamento !== undefined ? { faturamentoMensal: faturamento } : {}),
    ...(lucro ? { lucroDesejado: lucro } : {}),
    ...(valorHora !== undefined ? { valorHora } : {}),
    ...margens,
  };
  await prisma.configuracaoPrecificacao.upsert({
    where: { id: "unica" },
    create: { id: "unica", ...campos },
    update: campos,
  });

  return NextResponse.json({ ok: true });
}
