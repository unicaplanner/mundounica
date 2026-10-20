# Mundo da Unica — Hub

Casca do "Mundo da Unica": tela de login + menu que lista as ferramentas da
Unica Planner. Módulos ativos:

- **Central de Produção** — link pro sistema existente (que continua com seu
  próprio login separado, sem nenhuma alteração).
- **Financeiro** (`/financeiro`) — módulo interno, mesmo login do Mundo da
  Unica. Fase 1: precificador — custo de cada produto (ficha técnica de
  materiais, impressão, kits, custo por variante), registro de compras que
  atualiza o custo dos materiais, custos fixos e despesas por venda, markup,
  análise de lucro por variante e simulador de preço. Cadastro rápido: vendas
  dos últimos 12 meses por variante (tabela `VendaMensal`, puxada junto com o
  catálogo), lista ordenada pelos mais vendidos com % das vendas já com custo,
  classificação em lote, tipo "Não contar" (brindes) e modelo de ficha
  (copia a composição de um produto pra outros, variante por variante pelo nome).
  Embalagem de envio (`/financeiro/envio`): custo por pedido (caixa, papel de
  seda, mimos, etiqueta, folhas impressas) por tipo de caixa, com o % dos
  pedidos de cada uma; a média ponderada ÷ valor médio do pedido (tabela
  `ResumoMensal`) vira um % que entra nas despesas por venda do markup.
  Materiais têm link de compra. Impressão: só o número de folhas (frente e
  verso), com o custo da impressora mais cara (`impressoraPadrao`). Custos
  fixos em categorias fechadas (`src/lib/financeiro/categorias.ts`). Na tela do
  produto, "Para produzir" junta materiais e impressão (`ProducaoEditor`; papel
  com `Material.impresso` já soma a impressão na mesma quantidade) e o
  simulador mostra a conta completa até o lucro; a embalagem de envio entra
  em R$ por produto (custo médio do pedido ÷ unidades por pedido). Aba
  Materiais: colocar um material em vários produtos por nome de variante.
  Mão de obra: `ConfiguracaoPrecificacao.valorHora` × `minutosProducao` (produto ou
  variante) entra no custo; `TipoEnvio.minutos` = tempo de embalar o pedido.
  Lucro desejado padrão: 20% (vale pro negócio). Precificação por margem de
  contribuição: cada produto contra a meta do seu tipo (`margemProducao`,
  `margemKit`, `margemRevenda`); os fixos são pagos pela soma das margens
  (painel de cobertura na aba Precificação).
  Fase 2 (09/10/2026): fornecedores (`/financeiro/fornecedores`, `src/lib/financeiro/fornecedores.ts`),
  página de cada material com histórico de preço e estoque (`src/lib/financeiro/estoque.ts`:
  contagem + compras − saída pelas vendas), alerta de material que subiu
  (`src/lib/financeiro/alertas.ts`), margem real × prevista no Resultado do mês e
  fluxo de caixa de 90 dias (`/financeiro/caixa`, `src/lib/financeiro/caixa.ts`).

  Regras de precificação (markup divisor, como no Sebrae), tudo em % sobre o
  preço de venda (`src/lib/financeiro/analise.ts`):
  - custos fixos % = custos fixos do mês ÷ faturamento médio do mês (a média
    pode vir das vendas do Shopify, sem frete, cancelados nem pedidos teste)
  - preço sugerido = custo ÷ (1 − (fixos% + despesas% + lucro desejado%))
  - lucro = preço − custo − despesas por venda − parte dos custos fixos
  - impressão: toda folha conta frente e verso (custo da folha = 2 × custo
    por página); custo por página da impressora = (preço ÷ vida útil + tinta/ano +
    manutenção/ano) ÷ páginas por ano

- **Parcerias** (`/marketing/parcerias`, aba dentro do Marketing; os endereços antigos
  `/parcerias/...` redirecionam) — criadoras e influenciadoras, mesmo login.
  Junta os antigos "Leads de criadoras" e "Propostas de UGC" num cadastro só
  (`Criadora`, com `origem` prospecção / proposta / indicação):
  - **Captura relâmpago** (`/marketing/parcerias/nova`): cola o link do perfil e salva
    com data. `/marketing/parcerias/nova?link=...` salva sozinho (Atalho do iPhone no
    botão Compartilhar; o passo a passo está na tela).
  - **Triagem** (`/marketing/parcerias/triagem`): quadro por status (não revisada → pra
    contatar → contatada → respondeu → em negociação → fechou; não seguiu e
    descartada saem do quadro). Mudar status grava `statusEm` e o histórico.
  - **Ficha** (`/marketing/parcerias/criadoras/[id]`): perfil, gancho pra DM, DM pronta
    a partir dos modelos (`{nome}`, `{gancho}`, `{cupom}`), histórico,
    acordo (presente, permuta, pago, afiliada), cachê pago, autorização de
    anúncio, contato/endereço, **envios** (produtos do catálogo com o custo
    do Financeiro copiado na hora, ou avulsos, + frete e rastreio), **posts
    combinados** (prazo, link, sinalizou #publi) e **resultado** (investido ×
    vendas do cupom).
  - **Propostas** (`/marketing/parcerias/propostas`): cola a DM, o @ e o pedido
    (permuta/pago/valor) saem do texto (`src/lib/parcerias/avaliacao.ts`);
    checklist dos critérios da marca dá a sugestão aprovar / investigar /
    recusar; a decisão move a criadora no funil. Botão "Analisar com o
    Claude" (`src/lib/parcerias/claude.ts`) só aparece com
    `ANTHROPIC_API_KEY` configurada.
  - **Cupons**: vendas por `discount_code` nos pedidos do Shopify (subtotal
    sem frete, sem cancelados nem teste), botão no painel e na ficha.
  - **Formulário de permuta** (Google Forms): o Apps Script da planilha manda
    cada resposta pra `/api/parcerias/formulario?token=PARCERIAS_FORM_TOKEN`
    (rota liberada no `proxy.ts`, protegida pelo token). Acha a criadora pelo
    @, completa só os campos vazios da ficha e marca "fechou"; a resposta
    inteira fica guardada. O código pronto pra colar está em
    `/marketing/parcerias/formulario`.
  - **Campanhas** (ondas de envio) com checklist de tarefas por fase, filtro por
    lote/kit, estimativa de custo e os "combinados com toda criadora".
  - **Produção dos envios** (`/marketing/parcerias/producao`): checklist do que
    preparar pra cada criadora que fechou (cupom, case, blocos, cartão à mão,
    caixa, despacho), no estilo da Central de Produção. "Por etapa" junta tudo
    pra fazer em lote (imprimir os blocos de todas de uma vez); "Por criadora"
    mostra a lista de cada uma e deixa marcar fichas pra imprimir. A lista nasce
    de um modelo (`src/lib/parcerias/producao.ts`) e pode ser ajustada na ficha.
    Impressão em A5: lista (`/imprimir/parcerias/producao`) e uma ficha de envio
    por criadora, com endereço e o que ela pediu no formulário
    (`/imprimir/parcerias/ficha?id=...`). Tabela `ItemProducaoParceria`.
  - `scripts/importar-artefato.mjs`: importa o JSON do artefato
    "Influenciadoras Onda 1" (não versionar o JSON: tem dados pessoais).

- **Marketing** (`/marketing`), mesmo login. Abas: Minhas tarefas, Calendário,
  Parcerias (acima) e Mapa.
  - **Calendário de conteúdo** (`/marketing/calendario`): 90 dias em lotes de 15
    (`MktLote`), cada conteúdo (`MktConteudo`) com canal (stories, Instagram,
    TikTok, YouTube, e-mail, blog), nível **realista** (o essencial) ou **extra**
    (completa até o ritmo do plano estratégico), gancho, roteiro cena a cena,
    legenda, CTA, o que gravar e produtos. Barra de progresso por nível e link
    da pasta do Google Drive por lote.
  - **Ficha** (`/marketing/conteudo/[id]`): aprovar o roteiro, pedir ajuste (com
    nota), “já gravei”, “postei” (com link) e desfazer o último passo.
  - **Minhas tarefas** (`/marketing/tarefas`): junta o andamento dos conteúdos
    (aprovar 3 dias antes, gravar 1 dia antes, postar no dia; só fica atrasada
    depois da data do post) com as tarefas avulsas (`MktTarefa`, com link).
  - Os roteiros entram por arquivo: `marketing/lotes/00-lotes.json` (lotes) e
    `lote-NN.json` (conteúdos e tarefas), carregados com
    `node scripts/marketing-importar.mjs`. Reimportar atualiza pelo `codigo` e
    nunca desfaz o que a Lari marcou na tela; um conteúdo com ajuste pedido volta
    pra “pra aprovar”.
  - **Mapa**: nó central "Marketing"; tocar num braço abre os sub-braços (ex:
    Conteúdo → Instagram, TikTok, YouTube…), tocar de novo recolhe, e há o
    botão "Abrir tudo". No computador os braços ficam dos dois lados do centro;
    no celular vira uma árvore de cima pra baixo. A lista fica em
    `src/lib/marketing/mapa.ts` (sem banco): pra mudar um braço, edite só
    esse arquivo.

Feedbacks e ideias de produto aparece como "em breve" e será construído em
outra conversa.

Ver [`../Arquitetura - Mundo da Unica.md`](../Arquitetura%20-%20Mundo%20da%20Unica.md)
para a visão completa da plataforma e o plano das próximas fases.

## Stack

- **Next.js** (App Router) na Vercel
- **Supabase Auth** — login por email/senha, usuária única (a Lari)
- **Prisma + Postgres do mesmo projeto Supabase** para os dados do
  Financeiro, num schema privado (`financeiro` em produção,
  `financeiro_teste` no desenvolvimento). Nunca no `public`, que é exposto
  pela chave pública do Supabase — `src/lib/db-url.ts` se recusa a conectar
  sem um schema privado.
- **Shopify Admin API** (só leitura: produtos e pedidos) para o catálogo e o
  faturamento do Financeiro
- As tabelas de Parcerias ficam no mesmo schema privado do Financeiro
  (`Criadora` usa `Variante` pros produtos enviados)
- **Anthropic API** (opcional, `ANTHROPIC_API_KEY`) pra análise de
  propostas pelo Claude

## Configuração local

1. Crie um projeto em [supabase.com](https://supabase.com) (gratuito).
2. No dashboard do projeto: **Authentication → Users → Add user** — crie a
   sua conta (email + senha) manualmente. Não há tela pública de cadastro
   neste app; o login é só para essa usuária.
3. Em **Settings → API**, copie a **Project URL** e a **anon public key**.
4. Copie `.env.example` para `.env.local` e preencha:
   - `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (passo 3)
   - `NEXT_PUBLIC_CENTRAL_PRODUCAO_URL`: URL onde a Central de Produção está
     rodando (local ou já publicada)
   - `DATABASE_URL`: connection string do **Session pooler** do Supabase
     (botão Connect → Direct), terminando em `?schema=financeiro_teste`
   - `SHOPIFY_STORE_DOMAIN` e `SHOPIFY_ADMIN_ACCESS_TOKEN`: os mesmos da
     Central de Produção
   - `PARCERIAS_FORM_TOKEN`: texto longo e aleatório (senha do Apps Script
     do formulário de permuta)
   - `ANTHROPIC_API_KEY` (opcional): liga a análise de propostas pelo Claude
5. Instale as dependências, crie as tabelas no schema de teste e rode o app:

   ```bash
   npm install
   npm run db:push
   npm run dev
   ```

6. Em `/financeiro`, clique em **Sincronizar produtos do Shopify** pra puxar
   o catálogo.

## Deploy

1. Suba o repositório pro GitHub (deploy automático na Vercel a cada push
   na `main`).
2. Nas Environment Variables do projeto na Vercel, configure as mesmas
   variáveis do passo 4 — com `DATABASE_URL` terminando em
   `?schema=financeiro` (produção, não o de teste).
3. Antes do primeiro deploy com uma mudança de tabelas, aplique o schema no
   banco de produção apontando pra ele explicitamente:

   ```bash
   DATABASE_URL="...?schema=financeiro" npx prisma db push
   ```

## Estrutura

- `src/proxy.ts` — redireciona para `/login` quem não está autenticado (e
  vice-versa); renova a sessão da Supabase a cada request. No Next.js 16,
  `proxy.ts` substitui o antigo `middleware.ts`.
- `src/lib/supabase/client.ts` / `server.ts` — clientes Supabase para
  browser e para Server Components/Actions.
- `src/app/login/` — tela e Server Action de login.
- `src/app/page.tsx` — hub/menu com os módulos.
- `src/app/actions.ts` — Server Action de logout.
- `src/app/financeiro/` — telas do Financeiro (produtos, precificação,
  custos fixos, impressoras, ficha técnica,
  materiais, compras); `src/app/api/financeiro/` — rotas que gravam dados
  (cada uma confere o login de novo, além do proxy).
- `src/lib/financeiro/` — sync com o Shopify, cálculo de custo, consultas.
- `src/app/marketing/parcerias/`, `src/app/imprimir/`, `src/app/api/parcerias/`, `src/lib/parcerias/`,
  `src/components/parcerias/` — módulo Parcerias.
- `src/app/marketing/`, `src/components/marketing/MapaMental.tsx`,
  `src/lib/marketing/`, `src/app/api/marketing/`, `marketing/lotes/`,
  `scripts/marketing-importar.mjs` — módulo Marketing (mapa, calendário e tarefas).
- `prisma/schema.prisma` — tabelas do Financeiro, de Parcerias e do Marketing
  (`Mkt*`). Mudanças de banco em produção ficam em `prisma/sql/`.

### Regras do Financeiro

- Três tipos de produto: **produção própria** (custo = soma de quantidade ×
  custo atual de cada material da ficha técnica), **revenda** (custo de compra
  informado) e **kit** (soma do custo de outros produtos, cada um numa
  variante específica, + embalagem/extras como materiais). Kit não entra
  dentro de outro kit.
- Produto com variantes: ou uma composição só pra todas (variantes de cor),
  ou uma composição por variante (`custoPorVariante`, ex: A5 × Personal). Ao
  ligar o custo por variante, cada variante começa com uma cópia da
  composição do produto; dá pra copiar a composição de uma variante pras
  outras (filtrando pelo nome).
- Margem bruta = (preço da variante no Shopify − custo) / preço, sem taxas,
  frete ou imposto.
- O custo atual de um material é sempre o da **compra mais recente pela data
  da compra** — lançar uma compra antiga depois não "volta" o preço.
- O sync com o Shopify só atualiza título, status, link e as variantes (nome,
  SKU, preço); nunca mexe em classificação, custo ou composição. Variante que
  sumiu do Shopify fica inativa em vez de ser apagada (pode estar num kit).
- Ainda não há baixa de estoque por venda: "total já comprado" é só a soma
  das compras.

## Próximas fases (fora de escopo agora)

- **Fase 2**: login único também para a Central de Produção e para os
  módulos futuros (Supabase Auth substitui a senha própria de cada um).
- Construção do módulo Feedbacks e ideias de produto, conforme o documento
  de arquitetura.
