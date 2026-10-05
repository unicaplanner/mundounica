// Categorias dos custos fixos, agrupadas pela natureza da despesa (como num
// plano de contas de BPO financeiro). Ordem = ordem na tela.
export const CATEGORIAS_FIXOS = [
  { nome: "Pessoal", exemplos: "pró-labore, ajudante, freelancer" },
  { nome: "Estrutura", exemplos: "aluguel, energia, internet, telefone, água" },
  { nome: "Sistemas e assinaturas", exemplos: "Shopify, Claude, Canva, Google, apps" },
  { nome: "Administrativo", exemplos: "contador, tarifas bancárias" },
  { nome: "Marketing", exemplos: "anúncios fixos, parcerias mensais" },
  { nome: "Outros", exemplos: "o que não encaixar nas outras" },
] as const;

export const NOMES_CATEGORIAS: string[] = CATEGORIAS_FIXOS.map((c) => c.nome);

// Categorias da primeira versao (texto livre com sugestoes) -> as de agora.
const ANTIGAS: Record<string, string> = {
  "pró-labore": "Pessoal",
  "pro-labore": "Pessoal",
  ajudante: "Pessoal",
  aluguel: "Estrutura",
  energia: "Estrutura",
  "internet e telefone": "Estrutura",
  "plano do shopify": "Sistemas e assinaturas",
  "apps e assinaturas": "Sistemas e assinaturas",
  contador: "Administrativo",
  "marketing fixo": "Marketing",
};

// Categoria de um custo como deve aparecer: as atuais passam direto, as
// antigas viram a nova equivalente e qualquer outra coisa vira "Outros".
export function categoriaFixo(texto: string | null | undefined): string {
  const t = (texto ?? "").trim();
  const atual = NOMES_CATEGORIAS.find((n) => n.toLowerCase() === t.toLowerCase());
  return atual ?? ANTIGAS[t.toLowerCase()] ?? "Outros";
}
