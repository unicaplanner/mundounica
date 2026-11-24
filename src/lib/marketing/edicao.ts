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
