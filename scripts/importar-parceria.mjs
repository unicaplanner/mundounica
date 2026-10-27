// Lanca (ou completa) a ficha de uma criadora a partir de um JSON: dados,
// acordo detalhado, documentos, parcelas, posts combinados e historico.
// Pode rodar de novo: so cria o que ainda nao existe.
//
//   node scripts/importar-parceria.mjs caminho/criadora.json
//
// Usa a DATABASE_URL do ambiente (ou do .env.local, que e o schema de teste).
// O JSON tem dados pessoais: guarde fora do repositorio.
import { readFileSync } from "node:fs";
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const arquivo = process.argv[2];
if (!arquivo) {
  console.error("Uso: node scripts/importar-parceria.mjs caminho/criadora.json");
  process.exit(1);
}

const url = new URL(process.env.DATABASE_URL?.trim());
const schema = url.searchParams.get("schema");
if (!schema || schema === "public") throw new Error("DATABASE_URL precisa de ?schema= privado.");
url.searchParams.delete("schema");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString(), max: 2 }, { schema }) });

const dados = JSON.parse(readFileSync(arquivo, "utf8"));
const dia = (iso) => (iso ? new Date(`${iso}T12:00:00-03:00`) : null);
const { links = [], pagamentos = [], entregas = [], registros = [], ...ficha } = dados;

for (const k of ["statusEm", "pagoEm", "anuncioAte"]) if (ficha[k]) ficha[k] = dia(ficha[k]);
if (ficha.valorCombinado != null) ficha.valorCombinado = new Prisma.Decimal(ficha.valorCombinado);

const existente = await prisma.criadora.findUnique({ where: { instagram: ficha.instagram } });
const c = existente
  ? await prisma.criadora.update({ where: { id: existente.id }, data: ficha })
  : await prisma.criadora.create({ data: ficha });
console.log(`${existente ? "Atualizada" : "Criada"}: @${c.instagram}`);

for (const l of links) {
  if (await prisma.linkCriadora.findFirst({ where: { criadoraId: c.id, url: l.url } })) continue;
  await prisma.linkCriadora.create({ data: { criadoraId: c.id, titulo: l.titulo, url: l.url } });
}
if (pagamentos.length && !(await prisma.pagamentoParceria.count({ where: { criadoraId: c.id } }))) {
  for (const p of pagamentos) {
    await prisma.pagamentoParceria.create({
      data: { criadoraId: c.id, descricao: p.descricao, valor: new Prisma.Decimal(p.valor), vencimento: dia(p.vencimento), pagoEm: dia(p.pagoEm) },
    });
  }
}
if (entregas.length && !(await prisma.entregaParceria.count({ where: { criadoraId: c.id } }))) {
  for (const e of entregas) {
    await prisma.entregaParceria.create({ data: { criadoraId: c.id, formato: e.formato, prazo: dia(e.prazo), observacao: e.observacao ?? null } });
  }
}
for (const r of registros) {
  if (await prisma.registroCriadora.findFirst({ where: { criadoraId: c.id, texto: r.texto } })) continue;
  await prisma.registroCriadora.create({ data: { criadoraId: c.id, data: dia(r.data), texto: r.texto } });
}
console.log(`${links.length} documentos, ${pagamentos.length} parcelas, ${entregas.length} entregas, ${registros.length} anotações conferidos.`);
await prisma.$disconnect();
