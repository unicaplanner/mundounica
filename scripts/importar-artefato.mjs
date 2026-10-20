// Importa a planilha do artefato "Influenciadoras Onda 1" (o JSON de estado
// dele) pro modulo Parcerias. Roda uma vez; rodar de novo pula quem ja existe.
//
//   node scripts/importar-artefato.mjs caminho/onda1.json
//
// Usa a DATABASE_URL do .env.local (schema de teste). Pra producao:
//   DATABASE_URL="...?schema=financeiro" node scripts/importar-artefato.mjs onda1.json
//
// O JSON tem dados pessoais (e-mail, telefone): nao coloque ele no repositorio.
import { readFileSync } from "node:fs";
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const arquivo = process.argv[2];
if (!arquivo) {
  console.error("Uso: node scripts/importar-artefato.mjs caminho/onda1.json");
  process.exit(1);
}

const raw = process.env.DATABASE_URL?.trim();
const url = new URL(raw);
const schema = url.searchParams.get("schema");
if (!schema || schema === "public") throw new Error("DATABASE_URL precisa de ?schema= privado.");
url.searchParams.delete("schema");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString(), max: 2 }, { schema }) });

const estado = JSON.parse(readFileSync(arquivo, "utf8"));

// "1,6k" -> 1600
function seguidores(t) {
  const m = String(t ?? "")
    .trim()
    .toLowerCase()
    .match(/^(\d+(?:[.,]\d+)?)\s*(k)?/);
  if (!m) return null;
  return Math.round(Number(m[1].replace(",", ".")) * (m[2] ? 1000 : 1));
}

const meioDia = (iso) => new Date(`${iso}T12:00:00-03:00`);
const KIT = { inicio: "Case Início", premium: "Premium", reserva: "Reserva" };
// artefato: A conferir, Aprovada, DM enviada, Aceitou, Enviado, Postou, Vendeu, Recusou/sem resposta, Descartada
const STATUS = ["nova", "pra_contatar", "contatada", "fechada", "fechada", "fechada", "fechada", "nao_seguiu", "descartada"];
const FASES = {
  prep: "Preparação · 01 a 07/out",
  dm: "Abordagem · 06 a 12/out",
  envio: "Envio · 10 a 17/out",
  acomp: "Acompanhar posts · 20/out a 10/nov",
  nov: "Black Friday e próxima onda · novembro",
};
const atualizado = meioDia(estado.updated);

let campanha = await prisma.campanha.findUnique({ where: { nome: "Onda 1" } });
if (!campanha) {
  campanha = await prisma.campanha.create({
    data: {
      nome: "Onda 1",
      descricao: "Presente sem obrigação de postar, em outubro, pro conteúdo sair antes do pico de novembro. Mede por venda com cupom.",
      inicio: meioDia("2026-10-01"),
      fim: meioDia("2026-11-30"),
      tarefas: {
        create: estado.tasks.map((t, i) => ({ fase: FASES[t.phase] ?? t.phase, texto: t.text, dica: t.hint || null, responsavel: t.who, feita: t.done, posicao: i })),
      },
    },
  });
  console.log(`Campanha Onda 1 criada com ${estado.tasks.length} tarefas.`);
}

let criadas = 0;
for (const c of estado.creators) {
  const handle = c.h.toLowerCase();
  if (await prisma.criadora.findUnique({ where: { instagram: handle } })) {
    console.log(`  @${handle} já existe, pulando.`);
    continue;
  }
  const igTexto = String(c.ig ?? "");
  const tiktok = igTexto.match(/([\d,]+k?)\s*\(TikTok\)/i);
  const yt = String(c.yt ?? "").trim();
  const status = STATUS[c.status] ?? "nova";
  const email = c.note?.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0] ?? null;
  const fone = c.note?.match(/\(?\d{2}\)?\s*9?\d{4}-?\d{4}/)?.[0]?.replace(/\D/g, "") ?? null;
  // DM enviada em 08/10: conta desde la pro lembrete de 5 dias
  const statusEm = status === "contatada" && /08\/10/.test(c.note ?? "") ? meioDia("2026-10-08") : atualizado;

  await prisma.criadora.create({
    data: {
      instagram: handle,
      nome: c.name || null,
      seguidoresInstagram: seguidores(igTexto),
      tiktok: tiktok ? handle : null,
      seguidoresTiktok: tiktok ? seguidores(tiktok[1]) : null,
      youtube: yt ? "tem canal" : null,
      seguidoresYoutube: yt && yt !== "sim" ? seguidores(yt) : null,
      nicho: c.niche || null,
      motivo: c.why || null,
      alerta: c.flag || null,
      observacoes: c.seen ? `Visto em 03/10: ${c.seen}` : null,
      gancho: c.hook || null,
      status,
      statusEm,
      campanhaId: campanha.id,
      lote: c.lote || null,
      kit: KIT[c.kit] ?? c.kit,
      acordo: status === "fechada" ? "permuta" : null,
      email,
      whatsapp: fone && fone.length >= 10 ? fone : null,
      createdAt: meioDia("2026-09-30"),
      registros: c.note ? { create: { data: atualizado, texto: c.note } } : undefined,
    },
  });
  criadas += 1;
}
console.log(`${criadas} criadoras importadas.`);

const premium = estado.msgs.premium.replace("{compromisso}", estado.msgs.compromisso);
const modelos = [
  ["DM de abordagem · Case Início", estado.msgs.inicio],
  ["DM de abordagem · Premium", premium],
  ["Quando ela aceitar", estado.msgs.aceite],
  ["Lembrete (5 dias depois)", estado.msgs.lembrete],
  ["Trecho: convite pra review sincera", estado.msgs.review],
];
let posicao = await prisma.modeloMensagem.count();
for (const [titulo, texto] of modelos) {
  if (await prisma.modeloMensagem.findFirst({ where: { titulo } })) continue;
  await prisma.modeloMensagem.create({ data: { titulo, texto, posicao: posicao++ } });
}
console.log("Modelos de mensagem prontos.");
await prisma.$disconnect();
