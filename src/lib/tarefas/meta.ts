// Tipos, categorias, tags e helpers do modulo Tarefas. Sem Prisma: e usado
// tanto no servidor quanto nas telas de cliente.

export type StatusTarefa = "a_fazer" | "em_andamento" | "concluido";

export const ORDEM_STATUS: StatusTarefa[] = ["a_fazer", "em_andamento", "concluido"];

export const ROTULO_STATUS: Record<StatusTarefa, string> = {
  a_fazer: "A fazer",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};

// Categoria = de qual modulo/departamento a tarefa vem. `href` leva pro
// modulo (no formulario vira sugestao de link). `cor` e uma variavel do
// globals.css. As primeiras tambem geram tarefas automaticas.
export type Categoria = { valor: string; rotulo: string; cor: string; href?: string };

export const CATEGORIAS: Categoria[] = [
  { valor: "marketing", rotulo: "Marketing", cor: "var(--rosa)", href: "/marketing/tarefas" },
  { valor: "parcerias", rotulo: "Parcerias", cor: "var(--azul)", href: "/marketing/parcerias" },
  { valor: "financeiro", rotulo: "Financeiro", cor: "var(--ok)", href: "/financeiro" },
  { valor: "producao", rotulo: "Produção", cor: "var(--alerta)" },
  { valor: "atendimento", rotulo: "Atendimento", cor: "var(--atencao)" },
  { valor: "administrativo", rotulo: "Administrativo", cor: "var(--accent-ink)" },
  { valor: "geral", rotulo: "Geral", cor: "var(--muted)" },
];

const POR_CATEGORIA = new Map(CATEGORIAS.map((c) => [c.valor, c]));
export const categoria = (valor: string) => POR_CATEGORIA.get(valor) ?? POR_CATEGORIA.get("geral")!;

export type Tag = { valor: string; rotulo: string; cor: string };

// Classes escritas por extenso pro Tailwind encontrar.
export const TAGS: Tag[] = [
  { valor: "urgente", rotulo: "Urgente", cor: "bg-alerta text-background" },
  { valor: "prioridade", rotulo: "Prioridade", cor: "bg-atencao-soft text-atencao" },
  { valor: "aguardando", rotulo: "Aguardando", cor: "bg-azul-soft text-azul" },
  { valor: "aprovacao", rotulo: "Aprovação", cor: "bg-ok-soft text-ok" },
  { valor: "conferir", rotulo: "Conferir", cor: "bg-accent-soft text-accent-ink" },
];

const POR_TAG = new Map(TAGS.map((t) => [t.valor, t]));
export const tag = (valor: string): Tag => POR_TAG.get(valor) ?? { valor, rotulo: valor, cor: "bg-accent-soft text-muted" };

export type ItemChecklist = { texto: string; feito: boolean };

// Chamada pra API de outro modulo, feita direto do organizador (marcar a
// tarefa da campanha, aprovar o roteiro, marcar o proximo passo do envio...).
export type Chamada = { url: string; corpo: Record<string, unknown> };

// Tarefa no formato das telas, venha do banco (manual) ou de um modulo
// (auto). Tudo serializavel pra passar do servidor pro cliente.
export type TarefaUnificada = {
  id: string;
  origem: "manual" | "auto";
  manualId: string | null;
  titulo: string;
  descricao: string | null;
  categoria: string;
  tags: string[];
  status: StatusTarefa;
  prazo: string | null; // AAAA-MM-DD
  link: { href: string; rotulo: string; externo: boolean } | null;
  progresso: { feito: number; total: number } | null;
  checklist: ItemChecklist[];
  // auto: quadradinho que conclui no modulo de origem (some daqui depois)
  concluir: Chamada | null;
  // auto: botao de acao rapida ("Aprovar roteiro", "✓ Cartão escrito")
  acao: (Chamada & { rotulo: string }) | null;
  concluidaEm: string | null; // AAAA-MM-DD (fuso de Sao Paulo)
};

// ---------- datas (chaves AAAA-MM-DD, mesma conta de marketing/datas.ts) ----------

const diaUTC = (iso: string) => new Date(`${iso}T00:00:00Z`);

export function diasEntre(de: string, ate: string) {
  return Math.round((diaUTC(ate).getTime() - diaUTC(de).getTime()) / 864e5);
}

const fmtDia = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "2-digit" });
const fmtCurto = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit" });
const fmtLongo = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
const fmtMes = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", month: "long", year: "numeric" });

const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function textoPrazo(prazo: string, hoje: string) {
  const d = diasEntre(hoje, prazo);
  if (d === 0) return "Hoje";
  if (d === 1) return "Amanhã";
  if (d === -1) return "Ontem";
  if (d < 0) return `${-d} dias atrás`;
  return (d < 7 ? fmtDia : fmtCurto).format(diaUTC(prazo)).replace(".", "");
}

export const dataLonga = (iso: string) => maiuscula(fmtLongo.format(diaUTC(iso)));
export const nomeDoMes = (iso: string) => maiuscula(fmtMes.format(diaUTC(iso)));
export const diaDaSemana = (iso: string) => diaUTC(iso).getUTCDay();

// ---------- ordem e estado ----------

const pesoTag = (t: TarefaUnificada) => (t.tags.includes("urgente") ? 0 : t.tags.includes("prioridade") ? 1 : 2);

// Prazo mais perto primeiro (sem prazo no fim); no mesmo dia, urgente e
// prioridade na frente.
export function compararTarefas(a: TarefaUnificada, b: TarefaUnificada) {
  if (a.prazo !== b.prazo) {
    if (!a.prazo) return 1;
    if (!b.prazo) return -1;
    return a.prazo < b.prazo ? -1 : 1;
  }
  return pesoTag(a) - pesoTag(b) || a.titulo.localeCompare(b.titulo, "pt-BR");
}

export const aberta = (t: TarefaUnificada) => t.status !== "concluido";
export const atrasada = (t: TarefaUnificada, hoje: string) => aberta(t) && !!t.prazo && t.prazo < hoje;

export function progressoDe(t: TarefaUnificada) {
  if (t.progresso) return t.progresso;
  if (t.checklist.length) return { feito: t.checklist.filter((c) => c.feito).length, total: t.checklist.length };
  return null;
}
