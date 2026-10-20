import { ParceriasNav } from "@/components/parcerias/ParceriasNav";
import { contarProducaoPendente } from "@/lib/parcerias/producao";

// O contador do menu le o banco: nada daqui pode ser montado no build.
export const dynamic = "force-dynamic";

// Parcerias mora dentro do Marketing: o cabecalho e as abas de cima vem do
// layout do /marketing, aqui so entra o menu das criadoras.
export default async function ParceriasLayout({ children }: LayoutProps<"/marketing/parcerias">) {
  // So um numero de enfeite no menu: se a tabela da producao ainda nao foi
  // criada no banco, as outras telas de Parcerias seguem abrindo.
  const producaoPendente = await contarProducaoPendente().catch(() => 0);

  return (
    <div>
      <ParceriasNav producaoPendente={producaoPendente} />
      {children}
    </div>
  );
}
