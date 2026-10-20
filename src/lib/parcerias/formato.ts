const FUSO = "America/Sao_Paulo";
export const dataBR = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO });
export const dataCurta = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit" });
const dataISOFmt = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO });

// Valor pra campo <input type="date">.
export const dataISO = (d: Date | null | undefined) => (d ? dataISOFmt.format(d) : "");

export function diasDesde(d: Date) {
  return Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
}

export function haQuanto(d: Date) {
  const dias = diasDesde(d);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  return `há ${dias} dias`;
}

// "@camile" ou o nome, pra titulo de cartao/ficha.
export function nomeExibicao(c: { instagram: string | null; tiktok?: string | null; youtube?: string | null; nome: string | null }) {
  if (c.instagram) return `@${c.instagram}`;
  if (c.tiktok) return `@${c.tiktok} (TikTok)`;
  if (c.youtube && !/^https?:/.test(c.youtube)) return `@${c.youtube} (YouTube)`;
  return c.nome ?? "Sem nome";
}
