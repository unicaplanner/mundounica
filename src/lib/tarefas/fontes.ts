import { prisma } from "@/lib/db";
import { tarefasDaLari } from "@/lib/marketing/tarefas";
import { diaISO, somarDias } from "@/lib/marketing/datas";
import { DIAS_LEMBRETE } from "@/lib/parcerias/rotulos";
import { ROTULO_ETAPA, ordemDaEtapa } from "@/lib/parcerias/etapas";
import { nomeExibicao } from "@/lib/parcerias/formato";
import { carregarEstoque } from "@/lib/financeiro/estoque";
import { getResumoProdutos } from "@/lib/financeiro/queries";
import type { TarefaUnificada } from "./meta";

// Tarefas automaticas: cada modulo vira uma lista de TarefaUnificada, montada
// na hora a partir do proprio dado do modulo. Quando a Lari resolve a coisa
// no modulo (ou pelo botao rapido daqui), a tarefa some sozinha.

const base = {
  origem: "auto",
  manualId: null,
  descricao: null,
  status: "a_fazer",
  progresso: null,
  checklist: [],
  concluir: null,
  acao: null,
  concluidaEm: null,
} satisfies Partial<TarefaUnificada>;

const ficha = (id: string) => ({ href: `/marketing/parcerias/criadoras/${id}`, rotulo: "Abrir a ficha", externo: false });

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

function urgenteSeVence(prazo: string | null, hoje: string) {
  return prazo && prazo <= hoje ? ["urgente"] : [];
}

// ---------- Marketing ----------
// Reaproveita a lista "Minhas tarefas" do Marketing (conteudos + avulsas).

const TAGS_DO_TIPO: Record<string, string[]> = { aprovar: ["aprovacao"], decidir: ["aprovacao"] };

export async function tarefasMarketing(hoje: string): Promise<TarefaUnificada[]> {
  const [lista, ajustando] = await Promise.all([
    tarefasDaLari(),
    prisma.mktConteudo.findMany({ where: { status: "ajustar" }, select: { id: true, formato: true, titulo: true, notaLari: true } }),
  ]);

  const tarefas: TarefaUnificada[] = lista.map((t) => {
    const [principal] = t.links;
    let acao: TarefaUnificada["acao"] = null;
    let status: TarefaUnificada["status"] = "a_fazer";
    if (t.origem.tipo === "conteudo") {
      const url = `/api/marketing/conteudos/${t.origem.id}`;
      if (t.tipo === "aprovar") acao = { rotulo: "Aprovar roteiro", url, corpo: { acao: "aprovar" } };
      else if (t.tipo === "produzir") acao = { rotulo: "Já gravei / fotografei", url, corpo: { acao: "produzido" } };
      else acao = { rotulo: "Postei", url, corpo: { acao: "publicado" } };
      if (t.tipo !== "aprovar") status = "em_andamento";
    }
    return {
      ...base,
      id: `mkt:${t.chave}`,
      titulo: t.titulo,
      descricao: t.detalhe ?? null,
      categoria: "marketing",
      tags: [...(TAGS_DO_TIPO[t.tipo] ?? []), ...urgenteSeVence(t.prazo, hoje)],
      status,
      prazo: t.prazo,
      link: principal ? { href: principal.href, rotulo: principal.rotulo, externo: !!principal.externo } : null,
      concluir:
        t.origem.tipo === "avulsa" ? { url: `/api/marketing/tarefas/${t.origem.id}`, corpo: { feita: true } } : null,
      acao,
    };
  });

  // Ajuste pedido: nao depende da Lari, so fica a vista.
  for (const c of ajustando) {
    tarefas.push({
      ...base,
      id: `mkt:ajuste:${c.id}`,
      titulo: `Esperando ajuste do roteiro · ${c.formato}: ${c.titulo}`,
      descricao: c.notaLari ? `Você pediu: “${c.notaLari}”` : null,
      categoria: "marketing",
      tags: ["aguardando"],
      status: "em_andamento",
      prazo: null,
      link: { href: `/marketing/conteudo/${c.id}`, rotulo: "Ver o conteúdo", externo: false },
    });
  }
  return tarefas;
}

// ---------- Parcerias ----------

export async function tarefasParcerias(hoje: string, agora: Date): Promise<TarefaUnificada[]> {
  const [novas, praContatar, contatadas, propostas, respostasSoltas, producao, fechadasSemLista, entregas, aPagar, campanhas] =
    await Promise.all([
      prisma.criadora.count({ where: { status: "nova" } }),
      prisma.criadora.count({ where: { status: "pra_contatar" } }),
      prisma.criadora.findMany({
        where: { status: "contatada", statusEm: { lt: new Date(agora.getTime() - DIAS_LEMBRETE * 864e5) } },
        select: { id: true, nome: true, instagram: true, tiktok: true, youtube: true, statusEm: true },
      }),
      prisma.propostaUgc.findMany({
        where: { recomendacao: null, criadora: { status: { notIn: ["descartada", "nao_seguiu"] } } },
        select: { id: true, recebidaEm: true, criadora: { select: { nome: true, instagram: true, tiktok: true, youtube: true } } },
      }),
      prisma.respostaFormulario.count({ where: { criadoraId: null } }),
      prisma.itemProducaoParceria.findMany({
        where: { criadora: { status: "fechada" } },
        select: {
          id: true,
          etapa: true,
          texto: true,
          feito: true,
          posicao: true,
          criadora: { select: { id: true, nome: true, instagram: true, tiktok: true, youtube: true, kit: true } },
        },
      }),
      prisma.criadora.findMany({
        where: { status: "fechada", producao: { none: {} }, envios: { none: {} } },
        select: { id: true, nome: true, instagram: true, tiktok: true, youtube: true, kit: true },
      }),
      prisma.entregaParceria.findMany({
        where: { publicadoEm: null, prazo: { not: null }, criadora: { status: "fechada" } },
        select: {
          id: true,
          formato: true,
          prazo: true,
          criadora: { select: { id: true, nome: true, instagram: true, tiktok: true, youtube: true } },
        },
      }),
      prisma.criadora.findMany({
        where: { status: "fechada", acordo: "pago", pago: false },
        select: { id: true, nome: true, instagram: true, tiktok: true, youtube: true, valorCombinado: true },
      }),
      prisma.campanha.findMany({
        where: { tarefas: { some: { feita: false } } },
        select: {
          id: true,
          nome: true,
          tarefas: {
            where: { feita: false, NOT: { responsavel: "claude" } },
            orderBy: { posicao: "asc" },
            select: { id: true, fase: true, texto: true, dica: true },
          },
        },
      }),
    ]);

  const tarefas: TarefaUnificada[] = [];
  const triagem = { href: "/marketing/parcerias/triagem", rotulo: "Abrir a triagem", externo: false };

  if (novas > 0) {
    tarefas.push({
      ...base,
      id: "parc:novas",
      titulo: `Revisar ${plural(novas, "criadora capturada", "criadoras capturadas")}`,
      categoria: "parcerias",
      tags: ["conferir"],
      prazo: null,
      link: triagem,
    });
  }
  if (praContatar > 0) {
    tarefas.push({
      ...base,
      id: "parc:contatar",
      titulo: `Mandar DM pra ${plural(praContatar, "criadora", "criadoras")}`,
      categoria: "parcerias",
      tags: [],
      prazo: null,
      link: triagem,
    });
  }

  for (const c of contatadas) {
    const prazo = somarDias(diaISO(c.statusEm), DIAS_LEMBRETE);
    tarefas.push({
      ...base,
      id: `parc:lembrete:${c.id}`,
      titulo: `Cobrar resposta de ${nomeExibicao(c)}`,
      descricao: `Contatada há mais de ${DIAS_LEMBRETE} dias sem resposta`,
      categoria: "parcerias",
      tags: ["aguardando"],
      prazo: prazo < hoje ? hoje : prazo,
      link: ficha(c.id),
    });
  }

  for (const p of propostas) {
    tarefas.push({
      ...base,
      id: `parc:proposta:${p.id}`,
      titulo: `Avaliar proposta de ${nomeExibicao(p.criadora)}`,
      categoria: "parcerias",
      tags: ["aprovacao"],
      prazo: somarDias(diaISO(p.recebidaEm), 3),
      link: { href: `/marketing/parcerias/propostas/${p.id}`, rotulo: "Avaliar", externo: false },
    });
  }

  if (respostasSoltas > 0) {
    tarefas.push({
      ...base,
      id: "parc:respostas",
      titulo: `Ligar ${plural(respostasSoltas, "resposta", "respostas")} do formulário a uma criadora`,
      categoria: "parcerias",
      tags: ["conferir"],
      prazo: hoje,
      link: { href: "/marketing/parcerias/formulario", rotulo: "Abrir o formulário", externo: false },
    });
  }

  // Producao dos envios: uma tarefa por criadora, com o proximo item.
  const porCriadora = new Map<string, typeof producao>();
  for (const i of producao) {
    if (i.criadora.kit?.toLowerCase() === "reserva") continue;
    porCriadora.set(i.criadora.id, [...(porCriadora.get(i.criadora.id) ?? []), i]);
  }
  for (const itens of porCriadora.values()) {
    const pendentes = itens.filter((i) => !i.feito);
    if (!pendentes.length) continue;
    const proximo = [...pendentes].sort((a, b) => ordemDaEtapa(a.etapa) - ordemDaEtapa(b.etapa) || a.posicao - b.posicao)[0];
    const c = itens[0].criadora;
    const feitos = itens.length - pendentes.length;
    tarefas.push({
      ...base,
      id: `parc:envio:${c.id}`,
      titulo: `Preparar envio de ${nomeExibicao(c)}`,
      descricao: `Próximo: ${ROTULO_ETAPA[proximo.etapa] ?? proximo.etapa} — ${proximo.texto}`,
      categoria: "parcerias",
      tags: [],
      status: feitos > 0 ? "em_andamento" : "a_fazer",
      prazo: null,
      link: { href: "/marketing/parcerias/producao", rotulo: "Abrir a produção", externo: false },
      progresso: { feito: feitos, total: itens.length },
      acao: { rotulo: `✓ ${ROTULO_ETAPA[proximo.etapa] ?? "Feito"}`, url: `/api/parcerias/producao/${proximo.id}`, corpo: { feito: true } },
    });
  }

  for (const c of fechadasSemLista) {
    if (c.kit?.toLowerCase() === "reserva") continue;
    tarefas.push({
      ...base,
      id: `parc:semlista:${c.id}`,
      titulo: `Montar a lista de envio de ${nomeExibicao(c)}`,
      descricao: "Fechou parceria e ainda não tem checklist de produção",
      categoria: "parcerias",
      tags: ["prioridade"],
      prazo: null,
      link: { href: "/marketing/parcerias/producao", rotulo: "Abrir a produção", externo: false },
    });
  }

  for (const e of entregas) {
    const prazo = diaISO(e.prazo!);
    tarefas.push({
      ...base,
      id: `parc:post:${e.id}`,
      titulo: `Conferir ${e.formato} de ${nomeExibicao(e.criadora)}`,
      descricao: prazo < hoje ? "O prazo combinado passou e o post não foi marcado" : "Post combinado: marcar quando sair",
      categoria: "parcerias",
      tags: prazo < hoje ? ["aguardando", "urgente"] : ["aguardando"],
      status: "em_andamento",
      prazo,
      link: ficha(e.criadora.id),
    });
  }

  for (const c of aPagar) {
    const valor = c.valorCombinado?.toNumber();
    tarefas.push({
      ...base,
      id: `parc:pagar:${c.id}`,
      titulo: `Pagar cachê de ${nomeExibicao(c)}`,
      descricao: valor ? valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : null,
      categoria: "parcerias",
      tags: ["prioridade"],
      prazo: null,
      link: ficha(c.id),
    });
  }

  for (const camp of campanhas) {
    for (const t of camp.tarefas) {
      tarefas.push({
        ...base,
        id: `parc:camp:${t.id}`,
        titulo: t.texto,
        descricao: [`${camp.nome} · ${t.fase}`, t.dica].filter(Boolean).join(" — "),
        categoria: "parcerias",
        tags: [],
        prazo: null,
        link: { href: `/marketing/parcerias/campanhas/${camp.id}`, rotulo: "Abrir a campanha", externo: false },
        concluir: { url: `/api/parcerias/campanhas/${camp.id}/tarefas/${t.id}`, corpo: { feita: true } },
      });
    }
  }

  return tarefas;
}

// ---------- Financeiro ----------

const SALDO_VELHO_DIAS = 30;
const ESTOQUE_ACABANDO_MESES = 1;

export async function tarefasFinanceiro(hoje: string, agora: Date): Promise<TarefaUnificada[]> {
  const [resumo, config, estoque, materiais] = await Promise.all([
    getResumoProdutos(),
    prisma.configuracaoPrecificacao.findUnique({ where: { id: "unica" }, select: { saldoCaixaEm: true } }),
    carregarEstoque(),
    prisma.material.findMany({ select: { id: true, nome: true, unidade: true } }),
  ]);
  const tarefas: TarefaUnificada[] = [];

  if (resumo.naoClassificados > 0) {
    tarefas.push({
      ...base,
      id: "fin:classificar",
      titulo: `Classificar ${plural(resumo.naoClassificados, "produto", "produtos")} do Shopify`,
      descricao: "Sem tipo definido, o produto fica sem custo e sem preço sugerido",
      categoria: "financeiro",
      tags: ["conferir"],
      prazo: null,
      link: { href: "/financeiro?filtro=nao_classificados", rotulo: "Abrir os produtos", externo: false },
    });
  }

  const saldoEm = config?.saldoCaixaEm;
  if (!saldoEm || agora.getTime() - saldoEm.getTime() > SALDO_VELHO_DIAS * 864e5) {
    tarefas.push({
      ...base,
      id: "fin:saldo",
      titulo: "Atualizar o saldo em conta",
      descricao: saldoEm
        ? `Informado há mais de ${SALDO_VELHO_DIAS} dias: o fluxo de caixa fica impreciso`
        : "Sem saldo informado, o fluxo de caixa não projeta",
      categoria: "financeiro",
      tags: ["conferir"],
      prazo: null,
      link: { href: "/financeiro/caixa", rotulo: "Abrir o caixa", externo: false },
    });
  }

  const nomes = new Map(materiais.map((m) => [m.id, m]));
  for (const e of estoque.values()) {
    if (e.mesesRestantes === null || e.mesesRestantes >= ESTOQUE_ACABANDO_MESES) continue;
    const m = nomes.get(e.materialId);
    if (!m) continue;
    const dias = Math.floor(e.mesesRestantes * 30);
    tarefas.push({
      ...base,
      id: `fin:estoque:${m.id}`,
      titulo: `Comprar ${m.nome}`,
      descricao: dias <= 0 ? "Pela conta do estoque, já acabou" : `Pela média de consumo, acaba em ~${plural(dias, "dia", "dias")}`,
      categoria: "financeiro",
      tags: dias <= 7 ? ["urgente"] : ["prioridade"],
      prazo: dias <= 0 ? hoje : somarDias(hoje, Math.max(dias - 7, 0)),
      link: { href: `/financeiro/materiais/${m.id}`, rotulo: "Abrir o material", externo: false },
    });
  }

  return tarefas;
}
