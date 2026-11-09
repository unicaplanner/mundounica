import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { DetalhesConteudo } from "@/components/marketing/DetalhesConteudo";
import { diaISO } from "@/lib/marketing/datas";

export const dynamic = "force-dynamic";

export default async function ConteudoPage({ params }: PageProps<"/marketing/conteudo/[id]">) {
  const { id } = await params;
  const c = await prisma.mktConteudo.findUnique({
    where: { id },
    include: {
      lote: { select: { numero: true, pastaDriveUrl: true } },
      tarefas: { where: { feita: false }, select: { id: true, titulo: true } },
    },
  });
  if (!c) notFound();

  const origem = c.reaproveita
    ? await prisma.mktConteudo.findUnique({ where: { codigo: c.reaproveita }, select: { id: true, titulo: true, formato: true } })
    : null;

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/marketing/calendario?mes=${diaISO(c.data).slice(0, 7)}`} className="text-sm text-muted hover:text-ink">
        ← Calendário
      </Link>
      <DetalhesConteudo c={{ ...c, origem }} />
    </div>
  );
}
