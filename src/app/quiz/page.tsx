import type { Metadata } from "next";
import { QuizPropostas } from "@/components/quiz/QuizPropostas";
import { PERGUNTAS } from "@/lib/quiz/propostas";

export const metadata: Metadata = {
  title: "Quiz das propostas · Mundo da Unica",
};

export default function QuizPage() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <header className="mb-8 flex items-center justify-between">
        <p className="brand-mark text-sm text-accent-ink">Mundo da Unica</p>
      </header>

      <h1 className="font-serif text-3xl font-semibold text-ink">Qual proposta combina com você?</h1>
      <p className="mt-2 mb-10 text-sm leading-relaxed text-muted">
        {PERGUNTAS.length} perguntas sobre segurança, economia, trabalho, educação, saúde, meio ambiente
        e outras áreas. Em cada uma, escolha a opção mais próxima da sua opinião. As opções resumem os
        programas de governo do PT e do PL para 2026, sem dizer de quem é cada uma até o final.
      </p>

      <QuizPropostas />
    </div>
  );
}
