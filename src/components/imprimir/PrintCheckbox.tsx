// Quadradinho de checklist pra papel: desenhado com borda (sai bem em
// qualquer impressora, em preto e branco). Marcado mostra um "x".
// Mesmo desenho da Central de Producao.
export function PrintCheckbox({ checked = false }: { checked?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="mr-2 inline-flex h-[3.8mm] w-[3.8mm] shrink-0 items-center justify-center border-[0.3mm] border-black align-[-0.6mm] text-[9pt] font-bold leading-none"
    >
      {checked ? "✕" : ""}
    </span>
  );
}
