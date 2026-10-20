import { paraTexto } from "@/lib/financeiro/valores";
import { paraData } from "./leitura";

type DadosCampanha = { nome?: string; descricao?: string | null; inicio?: Date | null; fim?: Date | null };

export function lerCampanha(body: Record<string, unknown>): { ok: true; dados: DadosCampanha } | { ok: false; erro: string } {
  const veio = (k: string) => Object.prototype.hasOwnProperty.call(body, k);
  const d: DadosCampanha = {};
  if (veio("nome")) {
    const n = paraTexto(body.nome, 80);
    if (!n) return { ok: false, erro: "Dê um nome pra campanha." };
    d.nome = n;
  }
  if (veio("descricao")) d.descricao = paraTexto(body.descricao, 2000);
  for (const k of ["inicio", "fim"] as const) {
    if (!veio(k)) continue;
    const data = paraData(body[k]);
    if (data === undefined) return { ok: false, erro: "Data inválida." };
    d[k] = data;
  }
  return { ok: true, dados: d };
}

// Custo estimado de cada kit antes de lancar o envio real (faixa em reais:
// minimo e maximo). Vem do artefato "Influenciadoras Onda 1"; depois do envio
// o numero que vale e o do Financeiro, em "Investido".
const CUSTO_ESTIMADO_KIT: { quando: RegExp; faixa: [number, number] }[] = [
  { quando: /prem/i, faixa: [110, 150] },
  { quando: /in[ií]cio/i, faixa: [65, 80] },
];

export function estimativaDaOnda(kits: (string | null)[]) {
  let min = 0;
  let max = 0;
  for (const k of kits) {
    const f = CUSTO_ESTIMADO_KIT.find((e) => e.quando.test(k ?? ""))?.faixa;
    if (!f) continue;
    min += f[0];
    max += f[1];
  }
  return min > 0 ? { min, max } : null;
}

// Regras que valem pra toda criadora, do artefato da Onda 1.
export const COMBINADOS = [
  { titulo: "Sinalizar sempre", texto: "Presente leva “recebi de presente da @unicaplanner”; post pago leva #publi e o selo de parceria paga, logo no começo." },
  { titulo: "Briefing, não roteiro", texto: "Três pontos: montar do seu jeito, papel offset que não borra, chega em 3 dias pelo UPExpress. A voz é dela." },
  { titulo: "O que não dizer", texto: "Nada de urgência, culpa ou “mude sua vida”. É o oposto do que a UP defende." },
  { titulo: "Medir por venda", texto: "Cupom próprio + pergunta “como conheceu a UP?”. Curtida não entra na conta." },
] as const;

export const DICAS_DE_DM = [
  "Mande pela @unicaplanner, assinando como Lari.",
  "Antes de enviar, cite um post recente dela: aumenta muito a resposta.",
  "Faça 4 ou 5 DMs por dia, não as 20 de uma vez. Quem não segue a UP recebe em “Solicitações”.",
  "Endereço fica na ficha dela (vem do formulário de permuta), nunca na conversa.",
] as const;
