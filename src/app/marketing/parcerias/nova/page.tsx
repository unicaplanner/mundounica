import { CapturaRapida } from "@/components/parcerias/CapturaRapida";

export default async function NovaCriadoraPage({ searchParams }: PageProps<"/marketing/parcerias/nova">) {
  const { link } = await searchParams;
  const linkInicial = typeof link === "string" ? link : "";

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="font-serif text-2xl font-semibold text-ink">Capturar perfil</h2>
        <p className="text-sm text-muted">Achou alguém interessante no feed? Cola o link e volta a rolar. A triagem fica pra depois, com calma.</p>
      </div>

      <CapturaRapida linkInicial={linkInicial} />

      <details className="max-w-xl rounded-2xl bg-accent-soft/60 px-4 py-3 text-sm text-ink">
        <summary className="cursor-pointer font-semibold">Salvar direto do botão &quot;Compartilhar&quot; do iPhone</summary>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-muted">
          <li>Abra o app <b>Atalhos</b> e crie um atalho novo chamado &quot;Salvar criadora&quot;.</li>
          <li>Nos detalhes do atalho, ligue <b>Mostrar na Folha de Compartilhamento</b> e aceite <b>URLs</b> e <b>Texto</b>.</li>
          <li>
            Adicione a ação <b>Codificar URL</b> (Codificar a Entrada do Atalho).
          </li>
          <li>
            Adicione a ação <b>URL</b> com: <code className="break-all rounded bg-card px-1">https://mundounica.vercel.app/parcerias/nova?link=</code> e, logo depois do
            &quot;=&quot;, a variável <b>Texto Codificado</b>.
          </li>
          <li>
            Adicione a ação <b>Abrir URLs</b>.
          </li>
          <li>No Instagram ou TikTok: perfil → ⋯ → Compartilhar → Salvar criadora. Abre esta tela e já salva sozinho.</li>
        </ol>
        <p className="mt-2 text-xs text-muted">Precisa estar com o login do Mundo da Unica feito no Safari.</p>
      </details>
    </div>
  );
}
