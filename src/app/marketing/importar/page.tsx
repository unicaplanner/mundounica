import Link from "next/link";
import { ImportarPlano } from "@/components/marketing/ImportarPlano";

export const dynamic = "force-dynamic";

export default function ImportarPage() {
  return (
    <div className="flex flex-col gap-4">
      <Link href="/marketing/calendario" className="text-sm text-muted hover:text-ink">
        ← Calendário
      </Link>
      <div>
        <h2 className="font-serif text-2xl font-semibold text-ink">Importar plano</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Quando uma conversa do Claude montar um plano de conteúdo, ela te entrega um arquivo .json (o mesmo formato dos lotes do
          calendário). Cole o texto ou escolha o arquivo aqui. Primeiro aparece a prévia do que entra, muda e sai; nada é gravado
          até você clicar em “Aprovar e gravar”.
        </p>
      </div>
      <ImportarPlano />
    </div>
  );
}
