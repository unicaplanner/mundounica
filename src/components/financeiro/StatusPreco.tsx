import { ROTULO_STATUS, type StatusPreco as Status } from "@/lib/financeiro/analise";

const CORES: Record<Status, string> = {
  prejuizo: "bg-alerta-soft text-alerta",
  abaixo_meta: "bg-atencao-soft text-atencao",
  ok: "bg-ok-soft text-ok",
};

export function StatusPreco({ status }: { status: Status }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${CORES[status]}`}>
      {ROTULO_STATUS[status]}
    </span>
  );
}
