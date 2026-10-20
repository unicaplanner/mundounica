import Link from "next/link";
import { prisma } from "@/lib/db";
import { AcoesConteudo, TarefaFeita } from "@/components/marketing/Acoes";
import { tarefasDaLari, type TarefaLari } from "@/lib/marketing/tarefas";
import { CANAIS, TIPOS_TAREFA } from "@/lib/marketing/rotulos";
import { dataComDia, hojeISO, somarDias } from "@/lib/marketing/datas";

export const dynamic = "force-dynamic";

const FILTROS = [
  { valor: "", rotulo: "Todas" },
  { valor: "aprovar", rotulo: "Aprovar" },
  { valor: "produzir", rotulo: "Gravar / fotografar" },
  { valor: "postar", rotulo: "Postar" },
  { valor: "outras", rotulo: "Decidir e outras" },
];

const DO_CONTEUDO = ["aprovar", "produzir", "postar"];

function Item({ t, hoje }: { t: TarefaLari; hoje: string }) {
  const atrasada = t.prazo !== null && t.prazo < hoje;
  return (
    <li className="flex gap-3 rounded-xl border border-border bg-card p-3">
      {t.origem.tipo === "avulsa" && <TarefaFeita id={t.origem.id} feita={t.origem.feita} />}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-accent-ink">{TIPOS_TAREFA[t.tipo] ?? t.tipo}</span>
          {t.canal && <span className={`rounded-full px-2 py-0.5 ${CANAIS[t.canal].chip}`}>{CANAIS[t.canal].rotulo}</span>}
          {t.prazo && (
            <span className={atrasada ? "text-alerta" : "text-muted"}>
              {atrasada ? "atrasada · " : "até "}
              {dataComDia(t.prazo)}
            </span>
          )}
        </span>
        <p className={`text-sm font-semibold ${t.origem.tipo === "avulsa" && t.origem.feita ? "text-muted line-through" : "text-ink"}`}>{t.titulo}</p>
        {t.detalhe && <p className="text-xs whitespace-pre-line text-muted">{t.detalhe}</p>}
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {t.links.map((l) =>
            l.externo ? (
              <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-ink underline">
                {l.rotulo} ↗
              </a>
            ) : (
              <Link key={l.href} href={l.href} className="text-sm font-semibold text-ink underline">
                {l.rotulo}
              </Link>
            )
          )}
        </span>
        {t.origem.tipo === "conteudo" && t.tipo !== "aprovar" && <AcoesConteudo id={t.origem.id} status={t.origem.status} compacto />}
      </div>
    </li>
  );
}

export default async function TarefasPage({ searchParams }: PageProps<"/marketing/tarefas">) {
  const sp = await searchParams;
  const filtro = typeof sp.tipo === "string" ? sp.tipo : "";
  const verFeitas = sp.feitas === "1";
  const hoje = hojeISO();
  const semana = somarDias(hoje, 7);

  const [todas, esperandoClaude] = await Promise.all([
    tarefasDaLari({ incluirFeitas: verFeitas }),
    prisma.mktConteudo.findMany({
      where: { status: "ajustar" },
      orderBy: { data: "asc" },
      select: { id: true, titulo: true, formato: true, notaLari: true },
    }),
  ]);

  const lista = todas.filter((t) =>
    !filtro ? true : filtro === "outras" ? !DO_CONTEUDO.includes(t.tipo) : t.tipo === filtro
  );

  const grupos: { titulo: string; itens: TarefaLari[]; aberto: boolean }[] = [
    { titulo: "Atrasadas", itens: lista.filter((t) => t.prazo && t.prazo < hoje), aberto: true },
    { titulo: "Hoje", itens: lista.filter((t) => t.prazo === hoje), aberto: true },
    { titulo: "Próximos 7 dias", itens: lista.filter((t) => t.prazo && t.prazo > hoje && t.prazo <= semana), aberto: true },
    { titulo: "Depois", itens: lista.filter((t) => t.prazo && t.prazo > semana), aberto: false },
    { titulo: "Sem prazo", itens: lista.filter((t) => !t.prazo), aberto: true },
  ];

  const chip = (ativo: boolean) =>
    `rounded-full px-3 py-1 text-xs font-semibold transition-colors ${ativo ? "bg-ink text-background" : "bg-accent-soft text-ink/70 hover:bg-border"}`;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted">
        Tudo que depende de você: aprovar roteiros, gravar e fotografar, postar e decidir. Aprovar, gravar e postar somem
        daqui sozinhos quando você usa os botões; o resto você marca no quadradinho.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {FILTROS.map((f) => (
          <Link key={f.valor} href={`/marketing/tarefas${f.valor ? `?tipo=${f.valor}` : ""}`} className={chip(filtro === f.valor)}>
            {f.rotulo}
          </Link>
        ))}
        <Link href={verFeitas ? "/marketing/tarefas" : "/marketing/tarefas?feitas=1"} className="ml-auto text-xs text-muted underline">
          {verFeitas ? "Esconder as feitas" : "Ver também as feitas"}
        </Link>
      </div>

      {grupos
        .filter((g) => g.itens.length)
        .map((g) => (
          <details key={g.titulo} open={g.aberto} className="group flex flex-col gap-3">
            <summary className="cursor-pointer list-none text-sm font-semibold text-ink">
              <span className="mr-1 inline-block transition group-open:rotate-90">›</span>
              {g.titulo} <span className="text-muted">({g.itens.length})</span>
            </summary>
            <ul className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
              {g.itens.map((t) => (
                <Item key={t.chave} t={t} hoje={hoje} />
              ))}
            </ul>
          </details>
        ))}

      {!lista.length && <p className="text-sm text-muted">Nenhuma tarefa aqui. Respira. 🌿</p>}

      {esperandoClaude.length > 0 && (
        <section className="flex flex-col gap-2 rounded-2xl border border-dashed border-border p-4">
          <h3 className="text-sm font-semibold text-ink">Esperando o Claude ajustar ({esperandoClaude.length})</h3>
          <p className="text-xs text-muted">Não depende de você. Quando quiser, diga no chat: “faz os ajustes do marketing”.</p>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
            {esperandoClaude.map((c) => (
              <li key={c.id}>
                <Link href={`/marketing/conteudo/${c.id}`} className="text-ink underline">
                  {c.formato}: {c.titulo}
                </Link>
                {c.notaLari && <span className="text-muted"> — “{c.notaLari}”</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
