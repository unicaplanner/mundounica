import type { MktCanal, MktStatus } from "@prisma/client";

// Nomes e cores de canal e status, usados no calendario, na ficha e nas
// tarefas. Classes escritas por extenso para o Tailwind encontrar.

export const CANAIS: Record<MktCanal, { rotulo: string; chip: string; ponto: string }> = {
  stories: { rotulo: "Stories", chip: "bg-rosa-soft text-rosa", ponto: "bg-rosa" },
  instagram: { rotulo: "Instagram", chip: "bg-alerta-soft text-alerta", ponto: "bg-alerta" },
  tiktok: { rotulo: "TikTok", chip: "bg-azul-soft text-azul", ponto: "bg-azul" },
  youtube: { rotulo: "YouTube", chip: "bg-atencao-soft text-atencao", ponto: "bg-atencao" },
  email: { rotulo: "E-mail", chip: "bg-ok-soft text-ok", ponto: "bg-ok" },
  blog: { rotulo: "Blog", chip: "bg-accent-soft text-accent-ink", ponto: "bg-accent-ink" },
};

export const ORDEM_CANAIS: MktCanal[] = ["stories", "instagram", "tiktok", "youtube", "email", "blog"];

export const STATUS: Record<MktStatus, { rotulo: string; chip: string }> = {
  roteiro: { rotulo: "Pra você aprovar", chip: "bg-atencao-soft text-atencao" },
  ajustar: { rotulo: "Ajuste pedido", chip: "bg-alerta-soft text-alerta" },
  aprovado: { rotulo: "Aprovado · produzir", chip: "bg-azul-soft text-azul" },
  gravado: { rotulo: "Pronto pra postar", chip: "bg-ok-soft text-ok" },
  publicado: { rotulo: "Publicado", chip: "bg-ok text-background" },
};

// Conteudo "produzido" para a barra do lote: material pronto ou ja no ar.
export const PRODUZIDO: MktStatus[] = ["gravado", "publicado"];

export const TIPOS_TAREFA: Record<string, string> = {
  aprovar: "Aprovar",
  produzir: "Gravar / fotografar",
  postar: "Postar",
  decidir: "Decidir",
  foto: "Foto",
  video: "Vídeo",
  configurar: "Configurar",
  publicar: "Publicar",
  outro: "Fazer",
};
