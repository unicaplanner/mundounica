// Layout das paginas de impressao: sem o cabecalho e as abas do Hub. O @page
// define o papel A5 em pe; o que tiver a classe "no-print" some ao imprimir.
export default function ImprimirLayout({ children }: LayoutProps<"/imprimir">) {
  return (
    <div className="min-h-full flex-1 bg-white text-black print:bg-white">
      <style>{`
        @page { size: A5 portrait; margin: 8mm; }
        @media print {
          html, body { background: #fff !important; }
          .no-print { display: none !important; }
        }
      `}</style>
      {children}
    </div>
  );
}
