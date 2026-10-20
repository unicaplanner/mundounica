import type { Recomendacao } from "@prisma/client";

// Criterios de avaliacao de proposta, a luz do posicionamento da Unica:
// publico 25-44, tom "amiga inspiradora", anti produtividade toxica.
export type Resposta = "sim" | "parcial" | "nao_sei" | "nao";

export type Criterio = {
  chave: string;
  pergunta: string;
  dica: string;
  opcoes: Resposta[];
  // "nao" aqui derruba a proposta; nos outros, "nao" so pede investigar
  eliminatorio: boolean;
};

export const CRITERIOS: Criterio[] = [
  {
    chave: "estetica",
    pergunta: "A estética do feed combina com a Unica?",
    dica: "Tons, fotos, cuidado com a papelaria. Colorido demais ou bagunçado pesa contra.",
    opcoes: ["sim", "parcial", "nao"],
    eliminatorio: true,
  },
  {
    chave: "nicho",
    pergunta: "O conteúdo conversa com planner, organização, estudos, papelaria ou autocuidado?",
    dica: "Nicho distante (só moda, só fitness) raramente vende papelaria.",
    opcoes: ["sim", "parcial", "nao"],
    eliminatorio: true,
  },
  {
    chave: "tom",
    pergunta: "O tom é de amiga inspiradora, sem produtividade tóxica?",
    dica: "Fuja de \"disciplina acima de tudo\", hustle, culpa e \"mude sua vida\".",
    opcoes: ["sim", "parcial", "nao"],
    eliminatorio: true,
  },
  {
    chave: "publico",
    pergunta: "O público é principalmente de mulheres de 25 a 44 anos no Brasil?",
    dica: "Só dá pra ver logada ou pedindo print do público. Bio em inglês é sinal de público de fora.",
    opcoes: ["sim", "nao_sei", "nao"],
    eliminatorio: false,
  },
  {
    chave: "engajamento",
    pergunta: "Os comentários são de gente real (não só emoji e \"lindo!\")?",
    dica: "Abra os últimos 6 posts. Seguidoras compradas ou grupos de engajamento aparecem aqui.",
    opcoes: ["sim", "nao_sei", "nao"],
    eliminatorio: false,
  },
  {
    chave: "ativa",
    pergunta: "Postou com frequência no último mês?",
    dica: "Perfil parado há meses não entrega.",
    opcoes: ["sim", "nao"],
    eliminatorio: false,
  },
  {
    chave: "valor",
    pergunta: "O que ela pede faz sentido pro tamanho dela?",
    dica: "Permuta costuma valer. Cachê: compare com o alcance real e o que um kit custa (veja o Financeiro).",
    opcoes: ["sim", "nao_sei", "nao"],
    eliminatorio: false,
  },
];

export const ROTULO_RESPOSTA: Record<Resposta, string> = {
  sim: "Sim",
  parcial: "Mais ou menos",
  nao_sei: "Não sei ainda",
  nao: "Não",
};

export type Checklist = Partial<Record<string, Resposta>>;

export function lerChecklist(valor: unknown): Checklist {
  if (!valor || typeof valor !== "object") return {};
  const saida: Checklist = {};
  for (const c of CRITERIOS) {
    const r = (valor as Record<string, unknown>)[c.chave];
    if (typeof r === "string" && (c.opcoes as string[]).includes(r)) saida[c.chave] = r as Resposta;
  }
  return saida;
}

// Sugestao a partir do checklist. A Lari pode escolher outra.
export function sugerir(checklist: Checklist): { recomendacao: Recomendacao | null; motivos: string[] } {
  const respondidos = CRITERIOS.filter((c) => checklist[c.chave]);
  if (respondidos.length === 0) return { recomendacao: null, motivos: [] };

  const derruba = CRITERIOS.filter((c) => c.eliminatorio && checklist[c.chave] === "nao");
  if (derruba.length > 0) {
    return { recomendacao: "recusar", motivos: derruba.map((c) => `Não: ${c.pergunta.toLowerCase()}`) };
  }

  const duvidas = CRITERIOS.filter((c) => {
    const r = checklist[c.chave];
    return !r || r === "nao_sei" || r === "parcial" || r === "nao";
  });
  if (duvidas.length > 0) {
    return {
      recomendacao: "investigar",
      motivos: duvidas.map((c) => {
        const r = checklist[c.chave];
        return `${r ? ROTULO_RESPOSTA[r] : "Sem resposta"}: ${c.pergunta.toLowerCase()}`;
      }),
    };
  }
  return { recomendacao: "aprovar", motivos: ["Passou em todos os critérios."] };
}

// O que da pra tirar sozinho do texto da DM.
export type Extraido = {
  instagram: string | null;
  arrobas: string[];
  links: string[];
  email: string | null;
  pedido: "pago" | "permuta" | null;
  valor: number | null;
};

export function extrairDaDm(texto: string): Extraido {
  const links = [...new Set(texto.match(/https?:\/\/[^\s)]+/gi) ?? [])];
  const arrobas = [...new Set((texto.match(/(?:^|[\s(])@([a-z0-9._]{2,30})/gi) ?? []).map((a) => a.trim().replace(/^[(@]+/, "").replace(/^@/, "").toLowerCase()))].filter(
    (a) => a !== "unicaplanner" && !a.endsWith(".")
  );
  const email = texto.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0] ?? null;
  const instaLink = links.map((l) => l.match(/instagram\.com\/([a-z0-9._]+)/i)?.[1]).find(Boolean);
  const instagram = (instaLink ?? arrobas[0] ?? null)?.toLowerCase() ?? null;

  const baixo = texto.toLowerCase();
  const falaPago = /(cach[eê]|or[cç]amento|valor|investimento|tabela|pre[cç]o|r\$|pix|publi paga|m[ií]dia ?kit)/.test(baixo);
  const falaPermuta = /(permuta|troca|presente|receber (o|os|um) produto|enviar (o|os) produto)/.test(baixo);
  const pedido = falaPago ? "pago" : falaPermuta ? "permuta" : null;

  const valorTexto = texto.match(/R\$\s*([\d.]+(?:,\d{2})?)/i)?.[1];
  const valor = valorTexto ? Number(valorTexto.replace(/\./g, "").replace(",", ".")) : null;

  return { instagram, arrobas, links, email, pedido, valor: Number.isFinite(valor) ? valor : null };
}
