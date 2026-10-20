import type { OrigemCriadora, Recomendacao, StatusCriadora, TipoAcordo } from "@prisma/client";

// Ordem do funil: e a ordem das colunas na triagem.
export const STATUS: { valor: StatusCriadora; rotulo: string; cor: string }[] = [
  { valor: "nova", rotulo: "Não revisada", cor: "bg-accent-soft text-ink/70" },
  { valor: "pra_contatar", rotulo: "Pra contatar", cor: "bg-atencao-soft text-atencao" },
  { valor: "contatada", rotulo: "Contatada", cor: "bg-accent-soft text-ink" },
  { valor: "respondeu", rotulo: "Respondeu", cor: "bg-accent text-accent-ink" },
  { valor: "negociando", rotulo: "Em negociação", cor: "bg-atencao-soft text-atencao" },
  { valor: "fechada", rotulo: "Fechou parceria", cor: "bg-ok-soft text-ok" },
  { valor: "nao_seguiu", rotulo: "Não seguiu", cor: "bg-alerta-soft text-alerta" },
  { valor: "descartada", rotulo: "Descartada", cor: "bg-alerta-soft text-alerta" },
];

export const ROTULO_STATUS = Object.fromEntries(STATUS.map((s) => [s.valor, s.rotulo])) as Record<StatusCriadora, string>;
export const COR_STATUS = Object.fromEntries(STATUS.map((s) => [s.valor, s.cor])) as Record<StatusCriadora, string>;
export const STATUS_VALIDOS = STATUS.map((s) => s.valor);

// Colunas da triagem (os dois finais de "nao" ficam fora do quadro).
export const STATUS_QUADRO: StatusCriadora[] = ["nova", "pra_contatar", "contatada", "respondeu", "negociando", "fechada"];

export const ROTULO_ORIGEM: Record<OrigemCriadora, string> = {
  prospeccao: "Prospecção",
  proposta: "Proposta recebida",
  indicacao: "Indicação",
};

export const ROTULO_ACORDO: Record<TipoAcordo, string> = {
  presente: "Presente (sem obrigação)",
  permuta: "Permuta",
  pago: "Pago (cachê)",
  afiliada: "Afiliada (comissão)",
};

export const ROTULO_RECOMENDACAO: Record<Recomendacao, string> = {
  aprovar: "Aprovar",
  investigar: "Investigar melhor",
  recusar: "Recusar",
};

export const COR_RECOMENDACAO: Record<Recomendacao, string> = {
  aprovar: "bg-ok-soft text-ok",
  investigar: "bg-atencao-soft text-atencao",
  recusar: "bg-alerta-soft text-alerta",
};

export const FORMATOS = ["Reels", "Stories", "Post no feed", "TikTok", "YouTube", "Review", "Unboxing", "Outro"];

// Contatada ha mais que isso sem resposta: hora do lembrete (um so).
export const DIAS_LEMBRETE = 5;
