// Etapas da producao dos envios, na ordem de fazer. Fica separado de
// producao.ts (que fala com o banco) pra tambem ser usado nas telas de cliente.

export const ETAPAS = [
  { valor: "cupom", rotulo: "Criar o cupom no Shopify", dica: "10% pra seguidora, com o código no nome dela." },
  { valor: "kit", rotulo: "Separar a case", dica: "Case Início ou Case Clássica Premium, conforme o kit dela." },
  { valor: "blocos", rotulo: "Imprimir os blocos", dica: "Os blocos que ela escolheu no formulário. Imprima os de todas de uma vez pra baratear." },
  { valor: "cartao", rotulo: "Escrever o cartão à mão", dica: "Com o nome e o cupom dela: é o detalhe que mais aparece nos feedbacks." },
  { valor: "embalar", rotulo: "Montar e embalar", dica: "Case, blocos e cartão na caixa." },
  { valor: "enviar", rotulo: "Despachar e lançar o rastreio", dica: "Depois de enviar, lance o rastreio na ficha dela, em “O que foi enviado”." },
  { valor: "outro", rotulo: "Ajustes combinados", dica: "Trocas e pedidos especiais combinados no DM." },
] as const;

export type EtapaProducao = (typeof ETAPAS)[number]["valor"];
export const ETAPAS_VALIDAS: string[] = ETAPAS.map((e) => e.valor);
export const ROTULO_ETAPA = Object.fromEntries(ETAPAS.map((e) => [e.valor, e.rotulo])) as Record<string, string>;

const ORDEM_ETAPA = Object.fromEntries(ETAPAS.map((e, i) => [e.valor, i])) as Record<string, number>;
export const ordemDaEtapa = (etapa: string) => ORDEM_ETAPA[etapa] ?? ETAPAS.length;
