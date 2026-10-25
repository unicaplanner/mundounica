// Quiz "Qual proposta combina com voce?": cada pergunta opoe o que o
// Programa de Governo da coligacao do PT e o Plano de Governo do PL dizem
// sobre o mesmo tema. As posicoes sao resumos do texto dos dois PDFs
// (eleicao de 2026), sem acrescentar nada que nao esteja neles.

export type PropostaId = "pt" | "pl";

export const PROPOSTAS: Record<PropostaId, { nome: string; candidato: string; documento: string }> = {
  pt: {
    nome: "PT",
    candidato: "Lula",
    documento: "Programa de Governo da coligação PT, PSB, PV, PCdoB, PDT, PSOL e Rede",
  },
  pl: {
    nome: "PL",
    candidato: "Flávio Bolsonaro",
    documento: "Plano de Governo do PL",
  },
};

export type Pergunta = {
  id: string;
  area: string;
  pergunta: string;
  pt: string;
  pl: string;
  // Alterna a ordem das opcoes na tela para a posicao de um lado nao
  // aparecer sempre primeiro (fixo, para nao mudar entre servidor e cliente).
  plPrimeiro: boolean;
};

export const PERGUNTAS: Pergunta[] = [
  {
    id: "crime-organizado",
    area: "Segurança pública",
    pergunta: "Como o governo federal deveria enfrentar facções e o crime organizado?",
    pt: "Integrar União, estados e municípios (com um Ministério da Segurança Pública), usar inteligência e asfixiar o dinheiro do crime, dentro dos limites da Constituição, junto com prevenção e presença do Estado nas periferias.",
    pl: "Classificar PCC, CV e milícias como organizações narcoterroristas, criar uma tropa de elite das Forças Armadas nas fronteiras e ocupar portos e aeroportos com tropas especiais.",
    plPrimeiro: false,
  },
  {
    id: "punicao",
    area: "Segurança pública",
    pergunta: "Qual caminho é melhor para punir crimes graves e lidar com os presídios?",
    pt: "Cumprir o Plano Pena Justa, isolar lideranças em presídios federais, reduzir a reincidência com garantia de direitos e ampliar mediação comunitária e justiça restaurativa.",
    pl: "Reduzir a maioridade penal para 16 anos, acabar com a progressão de regime em crimes hediondos e construir presídios de segurança máxima no modelo de El Salvador.",
    plPrimeiro: true,
  },
  {
    id: "vigilancia",
    area: "Segurança pública",
    pergunta: "Onde a tecnologia de vigilância deveria ser priorizada?",
    pt: "Câmeras corporais nos policiais, com padrões nacionais, mais controle interno e externo da atividade policial e policiamento de proximidade.",
    pl: "Reconhecimento facial em todo o país (o \"Muralha Brasileira\"), com mais de 1 milhão de novas câmeras em ruas, portos e aeroportos ligadas a bancos de dados criminais.",
    plPrimeiro: false,
  },
  {
    id: "contas-publicas",
    area: "Economia",
    pergunta: "Qual deve ser a prioridade nas contas públicas?",
    pt: "Manter o arcabouço fiscal atual, controlando o crescimento da despesa sem cortar políticas sociais, e seguir com o Estado puxando investimentos (como o Novo PAC).",
    pl: "Fazer um \"Tesouraço\": cortar gastos, ao menos 10 ministérios e cargos comissionados, criar nova regra fiscal focada em reduzir a dívida e entregar superávits.",
    plPrimeiro: true,
  },
  {
    id: "impostos",
    area: "Economia",
    pergunta: "O que fazer com os impostos?",
    pt: "Aprofundar a justiça tributária: cobrar mais dos super-ricos, manter a isenção de IR até R$ 5 mil e implementar a reforma do consumo com cashback para os mais pobres.",
    pl: "Rever a reforma tributária aprovada e os aumentos de impostos recentes para reduzir a carga sobre produção e consumo, baixando o IVA projetado.",
    plPrimeiro: false,
  },
  {
    id: "estado-empresario",
    area: "Economia",
    pergunta: "Qual deve ser o papel do Estado nas empresas e na indústria?",
    pt: "Política industrial ativa (Nova Indústria Brasil), com crédito público, compras governamentais e exigência de conteúdo local; Petrobras ampliando refino e voltando à distribuição de combustíveis.",
    pl: "Estado como regulador, não empresário: retomar a desestatização caso a caso, dirigentes de estatais escolhidos com regras de mercado, abertura comercial e adesão à OCDE.",
    plPrimeiro: true,
  },
  {
    id: "trabalho",
    area: "Trabalho",
    pergunta: "Como você mudaria as regras do trabalho?",
    pt: "Acabar com a escala 6x1 e reduzir a jornada para 40 horas sem corte de salário, combater a \"pejotização\", fortalecer a negociação coletiva e regulamentar o trabalho por aplicativo com direitos.",
    pl: "Fazer o negociado prevalecer sobre o legislado, reduzir o custo da contratação formal (com contratos mais baratos para o primeiro emprego e para quem tem 50+) e tirar sindicatos da frente das decisões.",
    plPrimeiro: false,
  },
  {
    id: "programas-sociais",
    area: "Proteção social",
    pergunta: "Qual deve ser o foco dos programas sociais?",
    pt: "Ampliar a proteção: Bolsa Família fortalecido, aumento real do salário mínimo todo ano e uma Política Nacional de Cuidados que trata o cuidado como direito universal.",
    pl: "Manter os programas, mas como \"porta de saída\": prioridade dos beneficiários em qualificação e emprego, volta sem fila ao benefício e o programa Ganha-Ganha, que dá vantagens a quem faz cursos e paga em dia.",
    plPrimeiro: true,
  },
  {
    id: "educacao-basica",
    area: "Educação",
    pergunta: "O que priorizar na educação básica?",
    pt: "Escola em tempo integral, creches pelo Novo PAC, o Pé-de-Meia contra a evasão no ensino médio, piso do magistério e expansão dos Institutos Federais.",
    pl: "Alfabetização pelo método fônico, mais escolas cívico-militares, escola \"sem doutrinação\", verba ligada a metas de aprendizagem e voucher para escola privada quando faltar vaga.",
    plPrimeiro: false,
  },
  {
    id: "ensino-superior",
    area: "Educação",
    pergunta: "E no ensino superior?",
    pt: "Novo ciclo de expansão e interiorização das universidades públicas, continuidade da política de cotas, mais assistência estudantil e novas universidades (Indígena e do Esporte).",
    pl: "Levar o ensino superior para o Ministério da Ciência e Tecnologia, priorizar pesquisa com impacto produtivo e trocar o modelo atual de financiamento por um empréstimo pago só quando o estudante estiver ganhando.",
    plPrimeiro: true,
  },
  {
    id: "saude",
    area: "Saúde",
    pergunta: "Como reduzir as filas e melhorar o SUS?",
    pt: "Expandir a rede pública (policlínicas, hospitais, Mais Médicos), manter o Farmácia Popular 100% gratuito e fortalecer a produção nacional de remédios e insumos de saúde.",
    pl: "Corrigir a tabela SUS para pagar o custo real a hospitais e santas casas e contratar exames e serviços da rede privada nos horários ociosos.",
    plPrimeiro: false,
  },
  {
    id: "meio-ambiente",
    area: "Meio ambiente",
    pergunta: "Qual abordagem ambiental faz mais sentido para você?",
    pt: "Desmatamento líquido zero até 2030, destinar terras públicas a unidades de conservação, terras indígenas e quilombolas, fiscalização reforçada e debater um caminho para longe dos combustíveis fósseis.",
    pl: "Zerar o desmatamento ilegal até 2029, licenciamento com prazo (se o órgão não responder a tempo, a licença sai), tratar o produtor como parceiro e exigir transparência de ONGs com dinheiro estrangeiro.",
    plPrimeiro: true,
  },
  {
    id: "energia",
    area: "Energia",
    pergunta: "Qual o melhor caminho para a energia?",
    pt: "Transição energética coordenada pelo Estado, com a Petrobras investindo em exploração, refino e biocombustíveis, regras de conteúdo local e foco no combate à pobreza energética.",
    pl: "Segurança energética ao menor preço: mais concorrência e investimento privado no gás, liberar o fracking com regras ambientais, reduzir impostos e encargos da conta de luz.",
    plPrimeiro: false,
  },
  {
    id: "terra",
    area: "Campo e terra",
    pergunta: "O que priorizar na questão da terra e do campo?",
    pt: "Reforma agrária, demarcação e retirada de invasores de terras indígenas, titulação de territórios quilombolas e crédito para agricultura familiar e agroecologia.",
    pl: "Segurança jurídica \"sem relativizações\" do direito de propriedade, titulação em massa do pequeno proprietário e autonomia para indígenas e quilombolas decidirem sobre atividades produtivas em suas terras.",
    plPrimeiro: true,
  },
  {
    id: "redes-sociais",
    area: "Democracia e instituições",
    pergunta: "Como o Estado deveria lidar com redes sociais e desinformação?",
    pt: "Avançar na regulação democrática das plataformas para impedir a difusão de desinformação e de campanhas de ódio.",
    pl: "Acabar com qualquer estrutura do Estado que rotule ou puna o que as pessoas dizem (\"Tesouraço na Censura\") e revogar atos do governo atual contra críticos.",
    plPrimeiro: false,
  },
  {
    id: "instituicoes",
    area: "Democracia e instituições",
    pergunta: "Qual mudança nas instituições você acha mais urgente?",
    pt: "Ampliar a participação social (conselhos, conferências, orçamento participativo) e debater com a sociedade o peso das emendas parlamentares no orçamento federal.",
    pl: "Reformar o STF (limitar decisões individuais de ministros, tirar o julgamento criminal de parlamentares) e acabar com a reeleição para presidente.",
    plPrimeiro: true,
  },
  {
    id: "costumes",
    area: "Valores e diversidade",
    pergunta: "Qual visão está mais próxima da sua?",
    pt: "Políticas públicas que considerem gênero, identidade e orientação sexual, atendendo à população LGBTQIAP+, e garantia de direitos sexuais e reprodutivos das mulheres.",
    pl: "Governo guiado pela família e pela vida desde a concepção, e categoria feminina no esporte disputada apenas por atletas do sexo feminino.",
    plPrimeiro: false,
  },
  {
    id: "cultura",
    area: "Cultura",
    pergunta: "Como deveria ser o apoio à cultura?",
    pt: "Ampliar a Lei Rouanet e a Lei Aldir Blanc, os Pontos de Cultura nas periferias e regulamentar o streaming para proteger o audiovisual nacional.",
    pl: "Corrigir distorções das leis de incentivo, valorizar tradições e patrimônio histórico, e não subordinar a arte a agendas políticas.",
    plPrimeiro: true,
  },
  {
    id: "politica-externa",
    area: "Relações internacionais",
    pergunta: "Como o Brasil deveria se posicionar no mundo?",
    pt: "Aprofundar BRICS, Sul Global e integração sul-americana, defender a reforma da ONU e do FMI e rejeitar alinhamentos automáticos com potências.",
    pl: "Diplomacia pragmática focada em comércio, reaproximação com EUA, Argentina e Israel, adesão à OCDE e mais abertura comercial.",
    plPrimeiro: false,
  },
];
