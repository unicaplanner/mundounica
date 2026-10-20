import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { CRITERIOS } from "./avaliacao";

// Analise de proposta pelo Claude. So liga quando ANTHROPIC_API_KEY esta
// configurada na Vercel; sem ela, a tela usa so o checklist manual.
export function claudeConfigurado() {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

const Analise = z.object({
  recomendacao: z.enum(["aprovar", "investigar", "recusar"]),
  justificativa: z.string().describe("2 a 4 frases, em português, direto ao ponto"),
  perguntas: z
    .array(z.string())
    .describe("O que a Lari precisa conferir ou perguntar à criadora porque você não tem acesso (seguidores reais, público, engajamento)"),
  checklist: z
    .object(Object.fromEntries(CRITERIOS.map((c) => [c.chave, z.enum(["sim", "parcial", "nao_sei", "nao"])])))
    .describe("Sua leitura de cada critério; use nao_sei quando o texto não permitir avaliar"),
  pedido: z.enum(["pago", "permuta", "nao_disse"]),
  valorPedido: z.number().nullable().describe("Valor em reais, se ela citou"),
});

export type AnaliseClaude = z.infer<typeof Analise>;

const SISTEMA = `Você ajuda a Lari, dona da Unica Planner (planners modulares e papelaria premium feitos à mão em Curitiba), a avaliar propostas de parceria que criadoras de conteúdo mandam por DM no Instagram.

Posicionamento da marca: público de mulheres de 25 a 44 anos; tom de "amiga inspiradora"; contra a produtividade tóxica (nada de culpa, hustle, "disciplina acima de tudo" ou "mude sua vida"). A Unica prefere permuta e seeding (presente sem obrigação) e mede resultado por vendas com cupom, não por curtidas.

Critérios:
${CRITERIOS.map((c) => `- ${c.chave}: ${c.pergunta} (${c.dica})`).join("\n")}

Você só vê o texto da DM e o que a Lari anotou. Você não consegue abrir o Instagram, então não invente número de seguidores, engajamento ou público: marque nao_sei e coloque em "perguntas" o que a Lari precisa conferir. Recomende "aprovar" só quando o que dá pra ver é bom e não há dúvida importante; "recusar" quando algo eliminatório (estética, nicho, tom) claramente não combina ou o pedido não faz sentido; nos outros casos, "investigar".`;

export async function analisarComClaude(dados: {
  texto: string;
  instagram: string | null;
  seguidores: string | null;
  nicho: string | null;
  notas: string | null;
}): Promise<AnaliseClaude> {
  const client = new Anthropic();
  const contexto = [
    `DM recebida:\n"""\n${dados.texto}\n"""`,
    dados.instagram && `Instagram: @${dados.instagram}`,
    dados.seguidores && `Seguidores (anotado pela Lari): ${dados.seguidores}`,
    dados.nicho && `Nicho (anotado pela Lari): ${dados.nicho}`,
    dados.notas && `Notas da Lari: ${dados.notas}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const resposta = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(Analise) },
    system: SISTEMA,
    messages: [{ role: "user", content: contexto }],
  });

  if (resposta.stop_reason === "refusal") throw new Error("O Claude não quis analisar essa mensagem. Use o checklist.");
  if (!resposta.parsed_output) throw new Error("A resposta do Claude veio incompleta. Tente de novo.");
  return resposta.parsed_output;
}
