import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { erro, getUsuario, naoAutenticado } from "@/lib/auth";
import { analisarComClaude, claudeConfigurado } from "@/lib/parcerias/claude";
import { formatarSeguidores } from "@/lib/parcerias/perfil";

// O Claude le a DM e preenche o checklist, a justificativa e o que falta
// perguntar. A decisao final continua sendo da Lari (botoes na tela).
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUsuario())) return naoAutenticado();
  if (!claudeConfigurado()) return erro("A análise pelo Claude ainda não está ligada (falta a ANTHROPIC_API_KEY na Vercel).", 503);
  const { id } = await params;

  const p = await prisma.propostaUgc.findUnique({
    where: { id },
    include: { criadora: { include: { registros: { orderBy: { data: "desc" }, take: 5 } } } },
  });
  if (!p) return erro("Essa proposta não existe mais.", 404);
  const c = p.criadora;
  const seguidores = [
    c.seguidoresInstagram && `${formatarSeguidores(c.seguidoresInstagram)} no Instagram`,
    c.seguidoresTiktok && `${formatarSeguidores(c.seguidoresTiktok)} no TikTok`,
    c.seguidoresYoutube && `${formatarSeguidores(c.seguidoresYoutube)} no YouTube`,
  ]
    .filter(Boolean)
    .join(", ");

  try {
    const a = await analisarComClaude({
      texto: p.texto,
      instagram: c.instagram,
      seguidores: seguidores || null,
      nicho: c.nicho,
      notas: [c.motivo, c.alerta, c.observacoes, ...c.registros.map((r) => r.texto)].filter(Boolean).join("\n") || null,
    });
    await prisma.propostaUgc.update({
      where: { id },
      data: {
        checklist: { ...a.checklist, _claude: a.recomendacao },
        justificativa: a.justificativa,
        perguntas: a.perguntas.join("\n") || null,
        pedido: a.pedido === "nao_disse" ? null : a.pedido,
        valorPedido: a.valorPedido !== null ? new Prisma.Decimal(a.valorPedido) : p.valorPedido,
        analisadaPor: "claude",
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    if (e instanceof Anthropic.AuthenticationError) return erro("A chave da API do Claude não foi aceita. Confira a ANTHROPIC_API_KEY.", 502);
    if (e instanceof Anthropic.RateLimitError) return erro("Muitas análises seguidas. Espere um minuto e tente de novo.", 429);
    if (e instanceof Anthropic.APIError) return erro("O Claude não respondeu agora. Tente de novo em instantes.", 502);
    return erro(e instanceof Error ? e.message : "Não deu certo. Tente de novo.", 502);
  }
}
