import type { Prisma, StatusCriadora } from "@prisma/client";
import { paraDecimal, paraLink, paraTexto } from "@/lib/financeiro/valores";
import { normalizarCupom } from "./cupons";
import { lerSeguidores, normalizarHandle } from "./perfil";
import { STATUS_VALIDOS } from "./rotulos";

// "2026-10-08" -> meio-dia desse dia (evita cair no dia anterior pelo fuso).
// undefined = invalida; null = vazio.
export function paraData(valor: unknown): Date | null | undefined {
  const t = String(valor ?? "").trim();
  if (!t) return null;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(t) ? new Date(`${t}T12:00:00-03:00`) : new Date(t);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

const ACORDOS = ["presente", "permuta", "pago", "afiliada"] as const;
const ORIGENS = ["prospeccao", "proposta", "indicacao"] as const;

type Lido<T> = { ok: true; dados: T } | { ok: false; erro: string };

// Le so os campos que vieram no corpo (PATCH parcial: cada tela manda o que edita).
export function lerCriadora(body: Record<string, unknown>): Lido<Prisma.CriadoraUncheckedUpdateInput> {
  const d: Prisma.CriadoraUncheckedUpdateInput = {};
  const veio = (k: string) => Object.prototype.hasOwnProperty.call(body, k);

  for (const k of ["nome", "nomeCompleto", "nicho", "kit"] as const) if (veio(k)) d[k] = paraTexto(body[k], 120);
  for (const k of ["motivo", "alerta", "observacoes", "gancho", "endereco"] as const) if (veio(k)) d[k] = paraTexto(body[k], 2000);
  if (veio("youtube")) d.youtube = paraTexto(body.youtube, 200);

  for (const k of ["instagram", "tiktok"] as const) {
    if (!veio(k)) continue;
    const t = String(body[k] ?? "").trim();
    if (!t) d[k] = null;
    else {
      const h = normalizarHandle(t);
      if (!h) return { ok: false, erro: `${k === "instagram" ? "Instagram" : "TikTok"}: use só o @ (letras, números, ponto e _).` };
      d[k] = h;
    }
  }

  for (const k of ["seguidoresInstagram", "seguidoresTiktok", "seguidoresYoutube"] as const) {
    if (!veio(k)) continue;
    const t = String(body[k] ?? "").trim();
    if (!t) d[k] = null;
    else {
      const n = lerSeguidores(t);
      if (n === null) return { ok: false, erro: "Seguidores: use um número como 12500 ou 12,5k." };
      d[k] = n;
    }
  }

  if (veio("email")) {
    const e = String(body.email ?? "").trim();
    if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { ok: false, erro: "E-mail inválido." };
    d.email = e || null;
  }
  if (veio("whatsapp")) {
    const w = String(body.whatsapp ?? "").replace(/\D/g, "");
    if (w && (w.length < 10 || w.length > 13)) return { ok: false, erro: "WhatsApp: digite o número com DDD." };
    d.whatsapp = w || null;
  }
  if (veio("linkOrigem")) {
    const l = paraLink(body.linkOrigem);
    if (l === undefined) return { ok: false, erro: "O link precisa começar com https://." };
    d.linkOrigem = l;
  }

  if (veio("status")) {
    if (!STATUS_VALIDOS.includes(body.status as StatusCriadora)) return { ok: false, erro: "Status inválido." };
    d.status = body.status as StatusCriadora;
  }
  if (veio("origem")) {
    if (!ORIGENS.includes(body.origem as (typeof ORIGENS)[number])) return { ok: false, erro: "Origem inválida." };
    d.origem = body.origem as (typeof ORIGENS)[number];
  }
  if (veio("acordo")) {
    const a = body.acordo || null;
    if (a !== null && !ACORDOS.includes(a as (typeof ACORDOS)[number])) return { ok: false, erro: "Tipo de acordo inválido." };
    d.acordo = a as (typeof ACORDOS)[number] | null;
  }
  if (veio("campanhaId")) d.campanhaId = paraTexto(body.campanhaId, 40);
  if (veio("lote")) {
    const t = String(body.lote ?? "").trim();
    const n = Number(t);
    if (t && (!Number.isInteger(n) || n < 0)) return { ok: false, erro: "Lote: use um número inteiro." };
    d.lote = t ? n : null;
  }

  if (veio("valorCombinado")) {
    if (String(body.valorCombinado ?? "").trim() && !paraDecimal(body.valorCombinado)) return { ok: false, erro: "Valor combinado inválido." };
    d.valorCombinado = paraDecimal(body.valorCombinado);
  }
  if (veio("comissaoPct")) {
    const c = paraDecimal(body.comissaoPct);
    if (String(body.comissaoPct ?? "").trim() && (!c || c.greaterThan(100))) return { ok: false, erro: "Comissão: um % entre 0 e 100." };
    d.comissaoPct = c;
  }
  if (veio("pago")) d.pago = Boolean(body.pago);
  if (veio("autorizaAnuncio")) d.autorizaAnuncio = Boolean(body.autorizaAnuncio);
  for (const k of ["pagoEm", "anuncioAte"] as const) {
    if (!veio(k)) continue;
    const data = paraData(body[k]);
    if (data === undefined) return { ok: false, erro: "Data inválida." };
    d[k] = data;
  }
  if (veio("cupom")) {
    const t = String(body.cupom ?? "").trim();
    const c = normalizarCupom(t);
    if (t && !c) return { ok: false, erro: "Cupom: só letras, números, - e _ (ex: CAMILE10)." };
    d.cupom = c;
    if (!c) {
      d.cupomPedidos = null;
      d.cupomVendas = null;
      d.cupomAtualizadoEm = null;
    }
  }
  return { ok: true, dados: d };
}
