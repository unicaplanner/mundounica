import { redirect } from "next/navigation";

// "Minhas tarefas" do Marketing virou um filtro do modulo Tarefas, que ja
// recebe as tarefas do Marketing (com os botoes Aprovar, Gravei e Postei).
export default async function TarefasMarketingPage({ searchParams }: PageProps<"/marketing/tarefas">) {
  const sp = await searchParams;
  const tag = sp.tipo === "aprovar" ? "&tag=aprovacao" : "";
  redirect(`/tarefas?categoria=marketing&visao=lista${tag}`);
}
