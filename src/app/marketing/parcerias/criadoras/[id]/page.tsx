import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatarReais } from "@/lib/financeiro/formato";
import { catalogoParaEnvio, etapaPosFechar, getCriadora, investimento } from "@/lib/parcerias/consultas";
import { dataBR, dataISO, haQuanto, nomeExibicao } from "@/lib/parcerias/formato";
import type { ItemResposta } from "@/lib/parcerias/formulario";
import { formatarSeguidores, linkPerfil, linkWhatsapp } from "@/lib/parcerias/perfil";
import { COR_RECOMENDACAO, ROTULO_ACORDO, ROTULO_ORIGEM, ROTULO_RECOMENDACAO } from "@/lib/parcerias/rotulos";
import { botaoSecundario } from "@/components/financeiro/estilos";
import { ordemDaEtapa } from "@/lib/parcerias/etapas";
import { BotaoAcao } from "@/components/parcerias/BotaoAcao";
import { ChecklistFicha } from "@/components/parcerias/ChecklistFicha";
import { Copiar } from "@/components/parcerias/Copiar";
import { DmPronta } from "@/components/parcerias/DmPronta";
import { EditorCampos } from "@/components/parcerias/EditorCampos";
import { Entregas } from "@/components/parcerias/Entregas";
import { NovoEnvio } from "@/components/parcerias/NovoEnvio";
import { Registros } from "@/components/parcerias/Registros";
import { StatusSelect } from "@/components/parcerias/StatusSelect";

export const dynamic = "force-dynamic";

const num = (n: number | null) => (n === null ? "" : String(n));
const dec = (d: { toNumber(): number } | null) => (d === null ? "" : d.toNumber().toFixed(2).replace(".", ","));

function Secao({ titulo, children, id }: { titulo: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h3 className="font-serif text-xl font-semibold text-ink">{titulo}</h3>
      {children}
    </section>
  );
}

export default async function CriadoraPage({ params }: PageProps<"/marketing/parcerias/criadoras/[id]">) {
  const { id } = await params;
  const [c, campanhas, modelos, catalogo] = await Promise.all([
    getCriadora(id),
    prisma.campanha.findMany({ select: { id: true, nome: true }, orderBy: { createdAt: "asc" } }),
    prisma.modeloMensagem.findMany({ orderBy: { posicao: "asc" }, select: { id: true, titulo: true, texto: true } }),
    catalogoParaEnvio(),
  ]);
  if (!c) notFound();

  const url = `/api/parcerias/criadoras/${c.id}`;
  const inv = investimento(c);
  const etapa = etapaPosFechar(c);
  const wa = linkWhatsapp(c.whatsapp);
  const redes = [
    c.instagram && { rotulo: "Instagram", href: linkPerfil("instagram", c.instagram), seg: c.seguidoresInstagram },
    c.tiktok && { rotulo: "TikTok", href: linkPerfil("tiktok", c.tiktok), seg: c.seguidoresTiktok },
    c.youtube && { rotulo: "YouTube", href: /^https?:|^@?[a-z0-9._]+$/i.test(c.youtube) ? linkPerfil("youtube", c.youtube.replace(/^@/, "")) : null, seg: c.seguidoresYoutube },
  ].filter((r): r is { rotulo: string; href: string | null; seg: number | null } => Boolean(r));
  const retorno = c.cupomVendas && inv.total > 0 ? c.cupomVendas.toNumber() / inv.total : null;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link href="/marketing/parcerias/criadoras" className="text-xs text-muted hover:text-ink">
          ← Todas as criadoras
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="break-all font-serif text-2xl font-semibold text-ink sm:text-3xl">{nomeExibicao(c)}</h2>
          <StatusSelect criadoraId={c.id} status={c.status} />
          {etapa && <span className="rounded-full bg-ok-soft px-3 py-1 text-xs font-semibold text-ok">{etapa}</span>}
        </div>
        <p className="text-sm text-muted">
          {[c.nome, ROTULO_ORIGEM[c.origem], c.campanha?.nome, c.lote && `Lote ${c.lote}`, c.kit, `no status atual ${haQuanto(c.statusEm)}`, `capturada em ${dataBR.format(c.createdAt)}`]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {redes.map((r) =>
            r.href ? (
              <a key={r.rotulo} href={r.href} target="_blank" rel="noopener noreferrer" className={botaoSecundario}>
                {r.rotulo}
                {r.seg !== null && ` · ${formatarSeguidores(r.seg)}`} ↗
              </a>
            ) : (
              <span key={r.rotulo} className="text-xs text-muted">
                {r.rotulo}: {c.youtube}
              </span>
            )
          )}
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="rounded-full bg-ok px-3.5 py-1.5 text-xs font-semibold text-white hover:opacity-90">
              WhatsApp
            </a>
          )}
          {c.email && (
            <a href={`mailto:${c.email}`} className={botaoSecundario}>
              {c.email}
            </a>
          )}
        </div>
        {c.alerta && <p className="max-w-2xl rounded-xl bg-atencao-soft px-4 py-2.5 text-sm text-atencao">{c.alerta}</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Secao titulo="Perfil">
          <EditorCampos
            url={url}
            campos={[
              { chave: "nome", rotulo: "Como chamar", valor: c.nome ?? "", placeholder: "Camile", largura: "media" },
              { chave: "instagram", rotulo: "Instagram (@)", valor: c.instagram ?? "", largura: "media" },
              { chave: "seguidoresInstagram", rotulo: "Seguidores no IG", valor: num(c.seguidoresInstagram), exibicao: formatarSeguidores(c.seguidoresInstagram), placeholder: "12,5k", largura: "curta" },
              { chave: "tiktok", rotulo: "TikTok (@)", valor: c.tiktok ?? "", largura: "media" },
              { chave: "seguidoresTiktok", rotulo: "Seguidores no TikTok", valor: num(c.seguidoresTiktok), exibicao: formatarSeguidores(c.seguidoresTiktok), largura: "curta" },
              { chave: "youtube", rotulo: "YouTube (@)", valor: c.youtube ?? "", largura: "media" },
              { chave: "seguidoresYoutube", rotulo: "Inscritos no YouTube", valor: num(c.seguidoresYoutube), exibicao: formatarSeguidores(c.seguidoresYoutube), largura: "curta" },
              { chave: "nicho", rotulo: "Nicho de conteúdo", valor: c.nicho ?? "", placeholder: "planner, concurso, rotina", largura: "inteira" },
              { chave: "motivo", rotulo: "Por que achou interessante", valor: c.motivo ?? "", tipo: "area" },
              { chave: "gancho", rotulo: "Gancho pessoal pra DM", valor: c.gancho ?? "", tipo: "area", dica: "Cite um post recente dela: aumenta muito a resposta. Entra no lugar de {gancho} na DM." },
              { chave: "alerta", rotulo: "Ponto de atenção", valor: c.alerta ?? "", placeholder: "Ex: bio em inglês, conferir público", largura: "inteira" },
              { chave: "observacoes", rotulo: "Observações", valor: c.observacoes ?? "", tipo: "area" },
            ]}
          />
        </Secao>

        <Secao titulo="Campanha e acordo">
          <EditorCampos
            url={url}
            campos={[
              {
                chave: "origem",
                rotulo: "Origem",
                tipo: "select",
                valor: c.origem,
                opcoes: Object.entries(ROTULO_ORIGEM).map(([valor, r]) => ({ valor, rotulo: r })),
              },
              {
                chave: "campanhaId",
                rotulo: "Campanha",
                tipo: "select",
                valor: c.campanhaId ?? "",
                opcoes: [{ valor: "", rotulo: "Nenhuma" }, ...campanhas.map((x) => ({ valor: x.id, rotulo: x.nome }))],
              },
              { chave: "lote", rotulo: "Lote", valor: num(c.lote), largura: "curta" },
              { chave: "kit", rotulo: "Kit", valor: c.kit ?? "", placeholder: "Case Início, Premium...", largura: "media" },
              {
                chave: "acordo",
                rotulo: "Tipo de acordo",
                tipo: "select",
                valor: c.acordo ?? "",
                opcoes: [{ valor: "", rotulo: "Ainda não definido" }, ...Object.entries(ROTULO_ACORDO).map(([valor, r]) => ({ valor, rotulo: r }))],
              },
              { chave: "valorCombinado", rotulo: "Cachê combinado (R$)", valor: dec(c.valorCombinado), exibicao: c.valorCombinado && formatarReais(c.valorCombinado.toNumber()), largura: "curta" },
              { chave: "pago", rotulo: "Cachê já pago", tipo: "check", valor: c.pago },
              { chave: "pagoEm", rotulo: "Pago em", tipo: "data", valor: dataISO(c.pagoEm), exibicao: c.pagoEm && dataBR.format(c.pagoEm), largura: "media" },
              { chave: "comissaoPct", rotulo: "Comissão de afiliada (%)", valor: dec(c.comissaoPct), exibicao: c.comissaoPct && `${c.comissaoPct.toNumber().toLocaleString("pt-BR")}%`, largura: "curta" },
              { chave: "cupom", rotulo: "Cupom no Shopify", valor: c.cupom ?? "", placeholder: "CAMILE10", largura: "media", dica: "Crie o cupom no Shopify com esse mesmo código." },
              { chave: "autorizaAnuncio", rotulo: "Autorizou usar o vídeo como anúncio", tipo: "check", valor: c.autorizaAnuncio },
              { chave: "anuncioAte", rotulo: "Uso em anúncio até", tipo: "data", valor: dataISO(c.anuncioAte), exibicao: c.anuncioAte && dataBR.format(c.anuncioAte), largura: "media" },
            ]}
          />
        </Secao>
      </div>

      <Secao titulo="DM pronta">
        <DmPronta modelos={modelos} criadora={c} />
      </Secao>

      <Secao titulo="Histórico da conversa">
        <Registros criadoraId={c.id} registros={c.registros.map((r) => ({ id: r.id, data: dataISO(r.data), texto: r.texto }))} />
      </Secao>

      {c.propostas.length > 0 && (
        <Secao titulo="Propostas que ela mandou">
          <ul className="space-y-2">
            {c.propostas.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 text-sm">
                <Link href={`/marketing/parcerias/propostas/${p.id}`} className="font-semibold text-ink hover:underline">
                  Recebida em {dataBR.format(p.recebidaEm)}
                </Link>
                {p.recomendacao ? (
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${COR_RECOMENDACAO[p.recomendacao]}`}>{ROTULO_RECOMENDACAO[p.recomendacao]}</span>
                ) : (
                  <span className="text-xs text-atencao">a avaliar</span>
                )}
                <span className="line-clamp-1 min-w-0 flex-1 text-xs text-muted">{p.texto}</span>
              </li>
            ))}
          </ul>
        </Secao>
      )}

      <Secao titulo="Contato e endereço">
        <EditorCampos
          url={url}
          vazio="Chega sozinho quando ela preenche o formulário de permuta."
          campos={[
            { chave: "nomeCompleto", rotulo: "Nome completo", valor: c.nomeCompleto ?? "", largura: "inteira" },
            { chave: "email", rotulo: "E-mail", tipo: "email", valor: c.email ?? "", largura: "media" },
            { chave: "whatsapp", rotulo: "WhatsApp", tipo: "tel", valor: c.whatsapp ?? "", placeholder: "41 99999-9999", largura: "media" },
            { chave: "endereco", rotulo: "Endereço de envio", tipo: "area", valor: c.endereco ?? "" },
          ]}
        />
        {c.endereco && (
          <Copiar texto={[c.nomeCompleto, c.endereco, c.whatsapp && `Tel: ${c.whatsapp}`].filter(Boolean).join("\n")} rotulo="Copiar pra etiqueta" />
        )}
        {c.respostas.length > 0 && (
          <details className="rounded-xl bg-accent-soft/50 px-4 py-3 text-sm">
            <summary className="cursor-pointer font-semibold text-ink">
              Respostas do formulário ({c.respostas.length}) · última em {dataBR.format(c.respostas[0].enviadaEm)}
            </summary>
            {c.respostas.map((r) => (
              <dl key={r.id} className="mt-3 grid gap-x-4 gap-y-1.5 border-t border-border pt-3 sm:grid-cols-[minmax(0,14rem)_1fr]">
                {(r.respostas as ItemResposta[]).map((i, k) => (
                  <div key={k} className="contents">
                    <dt className="text-xs text-muted">{i.pergunta}</dt>
                    <dd className="whitespace-pre-line text-ink">{i.resposta}</dd>
                  </div>
                ))}
              </dl>
            ))}
          </details>
        )}
      </Secao>

      <Secao titulo="Produção do envio" id="producao">
        <ChecklistFicha
          criadoraId={c.id}
          itens={[...c.producao]
            .sort((a, b) => ordemDaEtapa(a.etapa) - ordemDaEtapa(b.etapa) || a.posicao - b.posicao)
            .map((i) => ({ id: i.id, etapa: i.etapa, texto: i.texto, feito: i.feito }))}
        />
        {c.producao.length > 0 && (
          <a href={`/imprimir/parcerias/ficha?id=${c.id}`} target="_blank" rel="noopener noreferrer" className={botaoSecundario}>
            Imprimir a ficha de envio (A5)
          </a>
        )}
      </Secao>

      <Secao titulo="O que foi enviado">
        {c.envios.length === 0 ? (
          <p className="text-sm text-muted">Nada enviado ainda.</p>
        ) : (
          <ul className="space-y-3">
            {c.envios.map((e) => {
              const custo = e.itens.reduce((a, i) => a + (i.custoUnitario?.toNumber() ?? 0) * i.quantidade, 0) + (e.custoFrete?.toNumber() ?? 0);
              return (
                <li key={e.id} className="space-y-2 rounded-xl border border-border-soft p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">Enviado em {dataBR.format(e.data)}</span>
                    {e.entregueEm ? (
                      <span className="rounded-full bg-ok-soft px-2 py-0.5 text-xs font-semibold text-ok">entregue em {dataBR.format(e.entregueEm)}</span>
                    ) : (
                      <BotaoAcao url={`${url}/envios/${e.id}`} method="PATCH" body={{ entregueEm: dataISO(new Date()) }} rotulo="Marcar entregue hoje" />
                    )}
                    {e.rastreio && (
                      <span className="flex items-center gap-1 text-xs text-muted">
                        rastreio <code className="rounded bg-accent-soft px-1">{e.rastreio}</code>
                      </span>
                    )}
                    <span className="ml-auto tabular-nums text-ink">{formatarReais(custo)}</span>
                    <BotaoAcao
                      url={`${url}/envios/${e.id}`}
                      method="DELETE"
                      rotulo="Excluir"
                      confirmar="Excluir este envio?"
                      className="text-xs text-muted underline hover:text-alerta"
                    />
                  </div>
                  <ul className="space-y-0.5 text-xs text-muted">
                    {e.itens.map((i) => (
                      <li key={i.id} className="flex justify-between gap-3">
                        <span>
                          {i.quantidade}× {i.descricao}
                        </span>
                        <span className="tabular-nums">{i.custoUnitario ? formatarReais(i.custoUnitario.toNumber() * i.quantidade) : "sem custo"}</span>
                      </li>
                    ))}
                    {e.custoFrete && (
                      <li className="flex justify-between gap-3">
                        <span>Frete</span>
                        <span className="tabular-nums">{formatarReais(e.custoFrete.toNumber())}</span>
                      </li>
                    )}
                  </ul>
                  {e.observacao && <p className="text-xs text-muted">{e.observacao}</p>}
                </li>
              );
            })}
          </ul>
        )}
        <NovoEnvio criadoraId={c.id} catalogo={catalogo} />
      </Secao>

      <Secao titulo="Posts combinados">
        <Entregas
          criadoraId={c.id}
          entregas={c.entregas.map((e) => ({
            id: e.id,
            formato: e.formato,
            prazo: dataISO(e.prazo),
            publicadoEm: dataISO(e.publicadoEm),
            link: e.link,
            sinalizou: e.sinalizou,
            observacao: e.observacao,
          }))}
        />
      </Secao>

      <Secao titulo="Resultado">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-accent-soft/60 px-4 py-3">
            <p className="text-xs text-muted">Investido</p>
            <p className="font-serif text-2xl font-semibold tabular-nums text-ink">{formatarReais(inv.total)}</p>
            <p className="text-xs text-muted">
              produtos {formatarReais(inv.produtos)} · frete {formatarReais(inv.frete)}
              {inv.cache > 0 && ` · cachê ${formatarReais(inv.cache)}`}
            </p>
            {inv.semCusto > 0 && <p className="text-xs text-atencao">{inv.semCusto} item(ns) sem custo no Financeiro</p>}
          </div>
          <div className="rounded-xl bg-accent-soft/60 px-4 py-3">
            <p className="text-xs text-muted">Vendas com o cupom {c.cupom ?? ""}</p>
            <p className="font-serif text-2xl font-semibold tabular-nums text-ink">{c.cupomVendas ? formatarReais(c.cupomVendas.toNumber()) : "—"}</p>
            <p className="text-xs text-muted">
              {c.cupomPedidos !== null ? `${c.cupomPedidos} pedido(s)` : "ainda não buscado"}
              {c.cupomAtualizadoEm && ` · atualizado ${haQuanto(c.cupomAtualizadoEm)}`}
            </p>
          </div>
          <div className="rounded-xl bg-accent-soft/60 px-4 py-3">
            <p className="text-xs text-muted">Cada R$ 1 investido virou</p>
            <p className={`font-serif text-2xl font-semibold tabular-nums ${retorno === null ? "text-ink" : retorno >= 1 ? "text-ok" : "text-alerta"}`}>
              {retorno === null ? "—" : formatarReais(retorno)}
            </p>
            <p className="text-xs text-muted">em vendas (sem contar a margem)</p>
          </div>
        </div>
        {c.cupom ? (
          <BotaoAcao url={`${url}/cupom`} rotulo="Atualizar vendas do cupom" rotuloAndamento="Buscando no Shopify..." />
        ) : (
          <p className="text-sm text-muted">Cadastre o cupom dela em &quot;Campanha e acordo&quot; pra acompanhar as vendas.</p>
        )}
      </Secao>

      <div className="border-t border-border pt-4">
        <BotaoAcao
          url={url}
          method="DELETE"
          rotulo="Excluir criadora"
          confirmar="Excluir a ficha, o histórico, envios e propostas dela?"
          irPara="/marketing/parcerias/criadoras"
          className="text-xs text-muted underline hover:text-alerta"
        />
      </div>
    </div>
  );
}
