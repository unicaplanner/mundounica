import type { MktCampanha } from "@prisma/client";
import { dataCurta, diaISO, somarDias } from "./datas";

// Campanhas do Marketing: os dados da oferta preenchem os marcadores dos
// posts ([OFERTA], [DESCONTO], [QTD], [ULTIMO DIA], [PRAZO]...) e o ultimo
// dia de pedido sai do prazo de producao + entrega por regiao.

// Dados da campanha que os posts usam. Numeros ja convertidos (o Decimal do
// banco nao atravessa pra tela), por isso use resumoCampanha() pra montar.
export type CampanhaDados = Pick<
  MktCampanha,
  "id" | "nome" | "oferta" | "cupom" | "brinde" | "brindeQtd" | "quantidade" | "inicio" | "fim" | "prazoProducaoDias" | "ultimoDiaPedido" | "prazosRegiao"
> & { descontoPct: number | null; freteGratisAcima: number | null };

export function resumoCampanha(c: MktCampanha): CampanhaDados {
  return {
    id: c.id,
    nome: c.nome,
    oferta: c.oferta,
    cupom: c.cupom,
    brinde: c.brinde,
    brindeQtd: c.brindeQtd,
    quantidade: c.quantidade,
    inicio: c.inicio,
    fim: c.fim,
    prazoProducaoDias: c.prazoProducaoDias,
    ultimoDiaPedido: c.ultimoDiaPedido,
    prazosRegiao: c.prazosRegiao,
    descontoPct: c.descontoPct == null ? null : Number(c.descontoPct),
    freteGratisAcima: c.freteGratisAcima == null ? null : Number(c.freteGratisAcima),
  };
}

export type PrazoRegiao = { regiao: string; ultimoDia: string };

// Dias uteis de transporte a partir de Curitiba (estimativa pra JeT/Loggi;
// a Lari ajusta na campanha se a transportadora disser outra coisa).
export const ENTREGA_DIAS_UTEIS: { regiao: string; dias: number }[] = [
  { regiao: "Sul", dias: 3 },
  { regiao: "Sudeste", dias: 4 },
  { regiao: "Centro-Oeste", dias: 6 },
  { regiao: "Nordeste", dias: 8 },
  { regiao: "Norte", dias: 10 },
];

const ehUtil = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return d !== 0 && d !== 6;
};

// Volta n dias uteis a partir de uma data (sem contar fim de semana).
export function voltarDiasUteis(iso: string, n: number) {
  let d = iso;
  let falta = n;
  while (falta > 0) {
    d = somarDias(d, -1);
    if (ehUtil(d)) falta--;
  }
  return d;
}

// Ultimo dia de pedido pra chegar ate a data limite: limite - entrega - producao.
export function ultimoDiaPorRegiao(limite: string, prazoProducaoDias: number): PrazoRegiao[] {
  return ENTREGA_DIAS_UTEIS.map(({ regiao, dias }) => ({ regiao, ultimoDia: voltarDiasUteis(limite, dias + prazoProducaoDias) }));
}

export function lerPrazosRegiao(v: unknown): PrazoRegiao[] {
  if (!Array.isArray(v)) return [];
  return v.filter((p) => p && typeof p.regiao === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p.ultimoDia)) as PrazoRegiao[];
}

const reais = (v: unknown) => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const sem = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();

// "15/12 no Sul, 14/12 no Sudeste e 04/12 no Norte"
function listaRegioes(regioes: PrazoRegiao[]) {
  const partes = regioes.map((r) => `${dataCurta(r.ultimoDia)} no ${r.regiao}`);
  return partes.length > 1 ? `${partes.slice(0, -1).join(", ")} e ${partes.at(-1)}` : (partes[0] ?? "");
}

// Botoes de e-mail ([Ver a colecao], [Ler o guia]) nao sao marcadores.
const BOTAO = /^(VER|LER|ABRIR|ENTRAR|CONHECER|VOLTAR|COMPRAR|GARANTIR|QUERO|BOTAO)\b/;

export type Preenchido = { texto: string; faltando: string[]; usados: string[] };

// Troca os marcadores do texto pelos dados da campanha. O que nao tem valor
// fica no texto como esta e entra em "faltando", pra aparecer como aviso.
export function preencher(texto: string, c: CampanhaDados | null, prazoFilaDias?: number | null): Preenchido {
  const faltando = new Set<string>();
  const usados = new Set<string>();
  let datas = 0;

  const prazoDias = c?.prazoProducaoDias ?? prazoFilaDias ?? null;
  const regioes = lerPrazosRegiao(c?.prazosRegiao);
  const valor = (chave: string): string | null => {
    if (!c) return null;
    if (/^(OFERTA|CONDIC)/.test(chave)) return c.oferta;
    if (chave.startsWith("DESCONTO")) return c.descontoPct != null ? `${Number(c.descontoPct).toLocaleString("pt-BR")}%` : null;
    if (/^(QTD|QUANTIDADE|LOTE)/.test(chave)) return c.quantidade != null ? String(c.quantidade) : null;
    if (chave.startsWith("BRINDE")) return c.brinde ? (c.brindeQtd ? `${c.brinde} (${c.brindeQtd} unidades)` : c.brinde) : null;
    if (chave.startsWith("CUPOM")) return c.cupom;
    if (chave.startsWith("FRETE")) return c.freteGratisAcima != null ? `frete grátis acima de ${reais(c.freteGratisAcima)}` : null;
    if (/^(INICIO|DATA INICIO|DE)$/.test(chave)) return c.inicio ? dataCurta(c.inicio) : null;
    if (/^(FIM|DATA FIM|ATE)$/.test(chave)) return c.fim ? dataCurta(c.fim) : null;
    if (chave === "DATA") {
      // "valido de [DATA] a [DATA]": a 1a e o inicio, a 2a o fim.
      const d = datas++ === 0 ? c.inicio : c.fim;
      return d ? dataCurta(d) : null;
    }
    if (chave.startsWith("ULTIMO DIA")) {
      if (c.ultimoDiaPedido) return dataCurta(c.ultimoDiaPedido);
      if (regioes.length) return listaRegioes(regioes);
      return null;
    }
    if (chave.startsWith("PRAZO")) {
      const partes: string[] = [];
      if (prazoDias) partes.push(`produção em até ${prazoDias} dias úteis`);
      if (c.ultimoDiaPedido) partes.push(`pra chegar a tempo, peça até ${dataCurta(c.ultimoDiaPedido)}`);
      else if (regioes.length) partes.push(`pra chegar a tempo, peça até ${listaRegioes(regioes)}`);
      return partes.length ? partes.join("; ") : null;
    }
    return null;
  };

  const resultado = texto.replace(/\[([^\]\n]{1,60})\]/g, (todo, dentro: string) => {
    // [X], [nome] e afins tambem sao "a preencher", mas nao vem da campanha.
    if (BOTAO.test(sem(dentro))) return todo;
    const v = valor(sem(dentro));
    if (v) {
      usados.add(todo);
      return v;
    }
    faltando.add(todo);
    return todo;
  });
  return { texto: resultado, faltando: [...faltando], usados: [...usados] };
}

// Campanha ativa num dia (pra marcar a faixa no calendario).
export function ativaNoDia(c: Pick<MktCampanha, "inicio" | "fim">, dia: string) {
  if (!c.inicio) return false;
  return diaISO(c.inicio) <= dia && dia <= (c.fim ? diaISO(c.fim) : diaISO(c.inicio));
}

// Datas recorrentes (aniversario, picos) caem no mesmo dia/mes do ano pedido.
export function noAno(inicio: Date, fim: Date | null, ano: number) {
  const ini = `${ano}${diaISO(inicio).slice(4)}`;
  const f = fim ? `${ano + (diaISO(fim).slice(5) < diaISO(inicio).slice(5) ? 1 : 0)}${diaISO(fim).slice(4)}` : ini;
  return { inicio: ini, fim: f };
}
