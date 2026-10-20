import { prisma } from "@/lib/db";
import { Modelos } from "@/components/parcerias/Modelos";

export const dynamic = "force-dynamic";

export default async function MensagensPage() {
  const modelos = await prisma.modeloMensagem.findMany({ orderBy: { posicao: "asc" }, select: { id: true, titulo: true, texto: true } });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-serif text-2xl font-semibold text-ink">Modelos de mensagem</h2>
        <p className="text-sm text-muted">
          Use <code className="rounded bg-accent-soft px-1">{"{nome}"}</code>, <code className="rounded bg-accent-soft px-1">{"{gancho}"}</code> e{" "}
          <code className="rounded bg-accent-soft px-1">{"{cupom}"}</code>: na ficha de cada criadora a DM sai pronta, com os dados dela.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          <li>Mande pela @unicaplanner, assinando como Lari.</li>
          <li>Cite um post recente dela (o gancho): aumenta muito a resposta.</li>
          <li>4 ou 5 DMs por dia, não todas de uma vez. Quem não segue a Unica recebe em &quot;Solicitações&quot;.</li>
          <li>Presente leva &quot;recebi de presente da @unicaplanner&quot;; post pago leva #publi (regra do Conar).</li>
        </ul>
      </div>
      <Modelos modelos={modelos} />
    </div>
  );
}
