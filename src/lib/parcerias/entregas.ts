import { paraLink, paraTexto } from "@/lib/financeiro/valores";
import { paraData } from "./leitura";

type DadosEntrega = {
  formato?: string;
  prazo?: Date | null;
  publicadoEm?: Date | null;
  link?: string | null;
  sinalizou?: boolean;
  observacao?: string | null;
};

// Le so os campos que vieram (serve pro POST e pro PATCH).
export function lerEntrega(body: Record<string, unknown>): { ok: true; dados: DadosEntrega } | { ok: false; erro: string } {
  const veio = (k: string) => Object.prototype.hasOwnProperty.call(body, k);
  const d: DadosEntrega = {};
  if (veio("formato")) {
    const f = paraTexto(body.formato, 40);
    if (!f) return { ok: false, erro: "Escolha o formato." };
    d.formato = f;
  }
  for (const k of ["prazo", "publicadoEm"] as const) {
    if (!veio(k)) continue;
    const data = paraData(body[k]);
    if (data === undefined) return { ok: false, erro: "Data inválida." };
    d[k] = data;
  }
  if (veio("link")) {
    const l = paraLink(body.link);
    if (l === undefined) return { ok: false, erro: "O link precisa começar com https://." };
    d.link = l;
  }
  if (veio("sinalizou")) d.sinalizou = Boolean(body.sinalizou);
  if (veio("observacao")) d.observacao = paraTexto(body.observacao, 1000);
  return { ok: true, dados: d };
}
