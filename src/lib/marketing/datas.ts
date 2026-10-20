// As datas do calendario sao dias (coluna DATE): chegam como meia-noite UTC.
// Toda conta e formatacao aqui usa UTC pra o dia nunca "voltar um" no fuso
// do Brasil; "hoje" e calculado no fuso de Sao Paulo.

export function hojeISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export function diaISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function somarDias(iso: string, dias: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return diaISO(d);
}

const fmtCurto = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit" });
const fmtDia = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "2-digit" });
const fmtLongo = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });

const comoData = (v: Date | string) => (typeof v === "string" ? new Date(`${v}T00:00:00Z`) : v);

export const dataCurta = (v: Date | string) => fmtCurto.format(comoData(v));
export const dataComDia = (v: Date | string) => fmtDia.format(comoData(v)).replace(".", "");
export const dataLonga = (v: Date | string) => fmtLongo.format(comoData(v));
