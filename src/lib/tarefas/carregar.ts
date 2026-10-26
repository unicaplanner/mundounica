import { prisma } from "@/lib/db";
import { diaISO, hojeISO } from "@/lib/marketing/datas";
import { tarefasFinanceiro, tarefasMarketing, tarefasParcerias } from "./fontes";
import { compararTarefas, type ItemChecklist, type StatusTarefa, type TarefaUnificada } from "./meta";

// Tarefa manual concluida fica esse tempo na tela e depois e excluida de vez.
const MANTER_CONCLUIDAS_DIAS = 15;

const diaSP = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });

// Nao tem cron no Mundo da Unica: a limpeza roda quando a tela abre.
async function excluirConcluidasAntigas(agora: Date) {
  await prisma.tarefa.deleteMany({
    where: { status: "concluido", concluidaEm: { lt: new Date(agora.getTime() - MANTER_CONCLUIDAS_DIAS * 864e5) } },
  });
}

async function tarefasManuais(agora: Date): Promise<TarefaUnificada[]> {
  await excluirConcluidasAntigas(agora);
  const linhas = await prisma.tarefa.findMany();

  return linhas.map((t) => {
    const externo = !!t.link && !t.link.startsWith("/");
    return {
      id: `manual:${t.id}`,
      origem: "manual",
      manualId: t.id,
      titulo: t.titulo,
      descricao: t.descricao,
      categoria: t.categoria,
      tags: t.tags,
      status: t.status as StatusTarefa,
      prazo: t.prazo ? diaISO(t.prazo) : null,
      link: t.link ? { href: t.link, rotulo: externo ? "Abrir link" : "Abrir no módulo", externo } : null,
      progresso: null,
      checklist: Array.isArray(t.checklist) ? (t.checklist as unknown as ItemChecklist[]) : [],
      concluir: null,
      acao: null,
      concluidaEm: t.concluidaEm ? diaSP.format(t.concluidaEm) : null,
    };
  });
}

const FONTES = [
  { nome: "Marketing", carregar: (hoje: string) => tarefasMarketing(hoje) },
  { nome: "Parcerias", carregar: (hoje: string, agora: Date) => tarefasParcerias(hoje, agora) },
  { nome: "Financeiro", carregar: (hoje: string, agora: Date) => tarefasFinanceiro(hoje, agora) },
];

// Junta as manuais com as de cada modulo. Um modulo com erro nao derruba a
// tela: as tarefas dele ficam de fora e o nome aparece num aviso.
export async function carregarTarefas(agora = new Date()) {
  const hoje = hojeISO();
  const [manuais, ...resultados] = await Promise.allSettled([
    tarefasManuais(agora),
    ...FONTES.map((f) => f.carregar(hoje, agora)),
  ]);
  if (manuais.status === "rejected") throw manuais.reason;

  const tarefas = [...manuais.value];
  const comErro: string[] = [];
  resultados.forEach((r, i) => {
    if (r.status === "fulfilled") tarefas.push(...r.value);
    else {
      console.error(`Tarefas: falha ao carregar ${FONTES[i].nome}:`, r.reason);
      comErro.push(FONTES[i].nome);
    }
  });

  return { tarefas: tarefas.sort(compararTarefas), hoje, comErro };
}
