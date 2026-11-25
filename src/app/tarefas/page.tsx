import { carregarTarefas } from "@/lib/tarefas/carregar";
import { Organizador, type Visao } from "@/components/tarefas/Organizador";
import { CATEGORIAS, TAGS } from "@/lib/tarefas/meta";

export const dynamic = "force-dynamic";

const VISOES: Visao[] = ["hoje", "lista", "kanban", "calendario"];

// Organizador: as tarefas cadastradas aqui + as que cada modulo gera sozinho
// (Marketing, Parcerias, Financeiro). Abre sempre no "Hoje".
export default async function TarefasPage({ searchParams }: PageProps<"/tarefas">) {
  const sp = await searchParams;
  const visao = VISOES.find((v) => v === sp.visao) ?? "hoje";
  // Atalhos dos modulos: /tarefas?categoria=marketing&tag=aprovacao abre ja filtrado.
  const categoria = CATEGORIAS.find((c) => c.valor === sp.categoria)?.valor;
  const tag = TAGS.find((t) => t.valor === sp.tag)?.valor;
  const { tarefas, hoje, comErro } = await carregarTarefas();

  return (
    <div className="flex flex-col gap-4">
      {comErro.length > 0 && (
        <p className="rounded-xl bg-atencao-soft px-4 py-2.5 text-xs text-atencao">
          Não deu pra carregar as tarefas de {comErro.join(", ")} agora. O resto está aqui; recarregue daqui a pouco.
        </p>
      )}
      <Organizador tarefas={tarefas} hoje={hoje} visaoInicial={visao} categoriaInicial={categoria} tagsIniciais={tag ? [tag] : []} />
    </div>
  );
}
