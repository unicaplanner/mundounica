import type { MktCanal, MktNivel } from "@prisma/client";
import { prisma } from "@/lib/db";
import { paraLink, paraTexto } from "@/lib/financeiro/valores";
import { somarDias } from "./datas";

// Regras de criar/editar um conteudo pela tela (ficha, "Novo post",
// remarcar). O mesmo formato de campos do JSON dos lotes.

export const CANAIS_VALIDOS: MktCanal[] = ["stories", "instagram", "tiktok", "youtube", "email", "blog"];
const NIVEIS_VALIDOS: MktNivel[] = ["realista", "extra"];

export const ehDia = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(`${v}T00:00:00Z`));
export const comoDia = (iso: string) => new Date(`${iso}T00:00:00Z`);

export type CamposConteudo = {
  data: string;
  horario: string | null;
  canal: MktCanal;
  formato: string;
  nivel: MktNivel;
  perfil: string | null;
  titulo: string;
  gancho: string | null;
  objetivo: string | null;
  legenda: string | null;
  hashtags: string | null;
  cta: string | null;
  linkCanva: string | null;
  produtos: string | null;
  campanha: string | null;
  campanhaId: string | null;
  pilar: string | null;
  producao: string | null;
  observacao: string | null;
};

// Le e valida o que veio do formulario. Devolve a mensagem de erro em
// portugues simples quando algo esta faltando.
export function lerCampos(body: Record<string, unknown>): { ok: true; campos: CamposConteudo } | { ok: false; erro: string } {
  if (!ehDia(body.data)) return { ok: false, erro: "Escolha a data do post." };
  const canal = body.canal as MktCanal;
  if (!CANAIS_VALIDOS.includes(canal)) return { ok: false, erro: "Escolha o canal (Stories, Instagram, TikTok, YouTube, E-mail ou Blog)." };
  const titulo = paraTexto(body.titulo, 200);
  if (!titulo) return { ok: false, erro: "Dê um título pro post." };
  const formato = paraTexto(body.formato, 80);
  if (!formato) return { ok: false, erro: "Diga o formato (ex: Carrossel, Reels, Stories)." };
  const linkCanva = paraLink(body.linkCanva);
  if (linkCanva === undefined) return { ok: false, erro: "O link do Canva precisa começar com https://." };
  const nivel = NIVEIS_VALIDOS.includes(body.nivel as MktNivel) ? (body.nivel as MktNivel) : "realista";

  return {
    ok: true,
    campos: {
      data: body.data,
      horario: paraTexto(body.horario, 20),
      canal,
      formato,
      nivel,
      perfil: paraTexto(body.perfil, 80),
      titulo,
      gancho: paraTexto(body.gancho, 500),
      objetivo: paraTexto(body.objetivo, 1000),
      legenda: paraTexto(body.legenda, 6000),
      hashtags: paraTexto(body.hashtags, 500),
      cta: paraTexto(body.cta, 500),
      linkCanva,
      produtos: paraTexto(body.produtos, 1000),
      campanha: paraTexto(body.campanha, 120),
      campanhaId: typeof body.campanhaId === "string" && body.campanhaId ? body.campanhaId : null,
      pilar: paraTexto(body.pilar, 120),
      producao: paraTexto(body.producao, 3000),
      observacao: paraTexto(body.observacao, 3000),
    },
  };
}

// O lote que cobre a data. Se nenhum cobre (ex: post de fevereiro), cria
// um lote novo de 15 dias comecando nessa data.
export async function loteDaData(iso: string) {
  const dia = comoDia(iso);
  const existente = await prisma.mktLote.findFirst({ where: { inicio: { lte: dia }, fim: { gte: dia } }, orderBy: { numero: "asc" } });
  if (existente) return existente.id;
  const ultimo = await prisma.mktLote.aggregate({ _max: { numero: true } });
  const numero = (ultimo._max.numero ?? 0) + 1;
  const novo = await prisma.mktLote.create({
    data: { numero, titulo: `Lote ${numero}`, inicio: dia, fim: comoDia(somarDias(iso, 14)) },
  });
  return novo.id;
}

// Codigo de quem nasceu na tela. Nao colide com os do JSON (l1-..., v3-...).
export function novoCodigo() {
  return `tela-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// Post criado pela propria Lari nao precisa da aprovacao dela: com arte no
// Canva ja esta pronto pra postar; sem arte, falta produzir.
export const statusInicial = (campos: { linkCanva: string | null }): "gravado" | "aprovado" => (campos.linkCanva ? "gravado" : "aprovado");

// ---------- campanhas ----------
// Le o formulario da campanha. Numeros aceitam "15", "15,5", "R$ 199".
export function lerCampanha(body: Record<string, unknown>) {
  const nome = paraTexto(body.nome, 120);
  if (!nome) return { ok: false as const, erro: "Dê um nome pra campanha (ex: Black Friday 2026)." };
  const num = (v: unknown) => {
    const t = String(v ?? "").replace(/[R$%\s]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };
  const inteiro = (v: unknown) => {
    const n = num(v);
    return n === undefined ? undefined : n === null ? null : Math.round(n);
  };
  const dia = (v: unknown) => (v ? (ehDia(v) ? comoDia(v) : undefined) : null);

  const campos = {
    nome,
    descricao: paraTexto(body.descricao, 3000),
    oferta: paraTexto(body.oferta, 1000),
    descontoPct: num(body.descontoPct),
    cupom: paraTexto(body.cupom, 60),
    brinde: paraTexto(body.brinde, 200),
    brindeQtd: inteiro(body.brindeQtd),
    quantidade: inteiro(body.quantidade),
    freteGratisAcima: num(body.freteGratisAcima),
    produtos: paraTexto(body.produtos, 3000),
    inicio: dia(body.inicio),
    fim: dia(body.fim),
    prazoProducaoDias: inteiro(body.prazoProducaoDias),
    ultimoDiaPedido: dia(body.ultimoDiaPedido),
  };
  const invalido = Object.entries(campos).find(([, v]) => v === undefined);
  if (invalido) return { ok: false as const, erro: `Confira o campo “${invalido[0]}”: valor inválido.` };
  if (campos.inicio && campos.fim && campos.fim < campos.inicio) return { ok: false as const, erro: "O fim da campanha está antes do início." };

  const regioes = Array.isArray(body.prazosRegiao)
    ? (body.prazosRegiao as { regiao?: unknown; ultimoDia?: unknown }[])
        .filter((r) => typeof r.regiao === "string" && ehDia(r.ultimoDia))
        .map((r) => ({ regiao: String(r.regiao), ultimoDia: String(r.ultimoDia) }))
    : [];
  return { ok: true as const, campos: { ...campos, prazosRegiao: regioes.length ? regioes : null } };
}

export function codigoDe(nome: string) {
  const base = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  return `${base || "campanha"}-${Math.random().toString(36).slice(2, 6)}`;
}
