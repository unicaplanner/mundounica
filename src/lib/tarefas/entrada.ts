import { Prisma } from "@prisma/client";
import { paraLink, paraTexto } from "@/lib/financeiro/valores";
import { CATEGORIAS, ORDEM_STATUS, TAGS, type StatusTarefa } from "./meta";

const CATEGORIAS_VALIDAS = new Set(CATEGORIAS.map((c) => c.valor));
const TAGS_VALIDAS = new Set(TAGS.map((t) => t.valor));

type Dados = Prisma.TarefaUncheckedUpdateInput;

// Le so os campos que vieram (serve pro POST e pro PATCH). No POST o titulo
// e obrigatorio e a categoria cai em "geral".
export function lerTarefa(body: Record<string, unknown>, criando: boolean): { ok: true; dados: Dados } | { ok: false; erro: string } {
  const veio = (k: string) => Object.prototype.hasOwnProperty.call(body, k);
  const d: Dados = {};

  if (veio("titulo") || criando) {
    const t = paraTexto(body.titulo, 200);
    if (!t) return { ok: false, erro: "Dê um título pra tarefa." };
    d.titulo = t;
  }
  if (veio("descricao")) d.descricao = paraTexto(body.descricao, 2000);
  if (veio("categoria") || criando) {
    const c = typeof body.categoria === "string" && body.categoria ? body.categoria : "geral";
    if (!CATEGORIAS_VALIDAS.has(c)) return { ok: false, erro: "Categoria inválida." };
    d.categoria = c;
  }
  if (veio("tags")) {
    if (!Array.isArray(body.tags)) return { ok: false, erro: "Tags inválidas." };
    d.tags = [...new Set(body.tags.map(String))].filter((t) => TAGS_VALIDAS.has(t));
  }
  if (veio("status")) {
    if (!ORDEM_STATUS.includes(body.status as StatusTarefa)) return { ok: false, erro: "Status inválido." };
    d.status = body.status as StatusTarefa;
    d.concluidaEm = body.status === "concluido" ? new Date() : null;
  }
  if (veio("prazo")) {
    if (body.prazo === null || body.prazo === "") d.prazo = null;
    else if (typeof body.prazo === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.prazo)) d.prazo = new Date(`${body.prazo}T00:00:00Z`);
    else return { ok: false, erro: "Prazo inválido." };
  }
  if (veio("link")) {
    const texto = String(body.link ?? "").trim();
    if (texto.startsWith("/")) d.link = texto.slice(0, 500);
    else {
      const l = paraLink(texto);
      if (l === undefined) return { ok: false, erro: "O link precisa começar com / (página do app) ou https://." };
      d.link = l;
    }
  }
  if (veio("checklist")) {
    if (!Array.isArray(body.checklist)) return { ok: false, erro: "Checklist inválido." };
    const itens = body.checklist
      .map((i) => ({ texto: paraTexto((i as { texto?: unknown })?.texto, 200), feito: (i as { feito?: unknown })?.feito === true }))
      .filter((i): i is { texto: string; feito: boolean } => !!i.texto);
    d.checklist = itens.length ? itens : Prisma.DbNull;
  }
  return { ok: true, dados: d };
}
