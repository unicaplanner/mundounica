// Mapa mental do Marketing. Para mudar o que aparece na tela, edite so esta
// lista: cada braco tem um titulo, uma frase curta e seus sub-bracos.
// "nota" e opcional (aparece em letra menor, ex: o mes da campanha).

export type Tom = "oliva" | "terra" | "ocre" | "rosa" | "azul" | "grafite";

export type SubBraco = {
  titulo: string;
  nota?: string;
};

export type Braco = {
  id: string;
  titulo: string;
  descricao: string;
  tom: Tom;
  filhos: SubBraco[];
};

export const MAPA_MARKETING: Braco[] = [
  {
    id: "conteudo",
    titulo: "Conteúdo",
    descricao: "Posts, vídeos e textos que trazem gente nova.",
    tom: "oliva",
    filhos: [
      { titulo: "Instagram", nota: "Reels, carrossel, stories" },
      { titulo: "TikTok", nota: "Vídeos curtos e TikTok Shop" },
      { titulo: "YouTube", nota: "Shorts e vídeos de “como usar”" },
      { titulo: "Pinterest", nota: "Pins de organização e inspiração" },
      { titulo: "Blog / SEO", nota: "Textos que aparecem no Google" },
    ],
  },
  {
    id: "email",
    titulo: "E-mail marketing",
    descricao: "Sequências automáticas e envios para a lista.",
    tom: "azul",
    filhos: [
      { titulo: "Boas-vindas", nota: "Quem acabou de se cadastrar" },
      { titulo: "Carrinho abandonado" },
      { titulo: "Lançamentos", nota: "Coleção nova, reposição" },
      { titulo: "Pós-compra", nota: "Como usar o planner, pedido de avaliação" },
      { titulo: "Reativação", nota: "Clientes que não compram há meses" },
      { titulo: "Newsletter", nota: "Novidades e conteúdo do mês" },
    ],
  },
  {
    id: "sazonais",
    titulo: "Campanhas sazonais",
    descricao: "As datas que mais vendem no ano.",
    tom: "terra",
    filhos: [
      { titulo: "Planner do ano novo", nota: "set – dez" },
      { titulo: "Volta às aulas", nota: "jan – fev" },
      { titulo: "Dia das Mães", nota: "maio" },
      { titulo: "Dia dos Namorados", nota: "junho" },
      { titulo: "Volta às aulas 2º semestre", nota: "julho" },
      { titulo: "Dia do Professor", nota: "outubro" },
      { titulo: "Black Friday", nota: "novembro" },
      { titulo: "Natal", nota: "dezembro" },
    ],
  },
  {
    id: "anuncios",
    titulo: "Anúncios",
    descricao: "Mídia paga para acelerar o que já funciona.",
    tom: "ocre",
    filhos: [
      { titulo: "Meta Ads", nota: "Instagram e Facebook" },
      { titulo: "TikTok Ads" },
      { titulo: "Google Shopping" },
      { titulo: "Mercado Livre Ads" },
      { titulo: "Remarketing", nota: "Quem visitou a loja e não comprou" },
    ],
  },
  {
    id: "influencia",
    titulo: "Influenciadoras / UGC",
    descricao: "Criadoras que mostram o planner na vida real.",
    tom: "rosa",
    filhos: [
      { titulo: "Permutas", nota: "Planner em troca de conteúdo" },
      { titulo: "Cupom da criadora", nota: "Vendas com o cupom de cada uma" },
      { titulo: "Conteúdo para anúncios", nota: "Vídeos UGC usados nos Ads" },
      { titulo: "Embaixadoras", nota: "Parceria contínua" },
    ],
  },
  {
    id: "relacionamento",
    titulo: "Relacionamento / Pós-venda",
    descricao: "Fazer quem comprou voltar e indicar.",
    tom: "grafite",
    filhos: [
      { titulo: "Cartão na caixa", nota: "Recado, QR code, cupom de volta" },
      { titulo: "Avaliações", nota: "Pedir foto e review" },
      { titulo: "Fidelidade e indicação" },
      { titulo: "WhatsApp", nota: "Atendimento e lista VIP" },
      { titulo: "Comunidade", nota: "Grupo de quem usa os planners" },
    ],
  },
];
