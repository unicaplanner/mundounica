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

Os demais (Leads de criadoras, Propostas de UGC, Feedbacks e ideias de
produto) aparecem como "em breve" e serão construídos em conversas
separadas.

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
- O mesmo projeto Supabase vai hospedar depois o banco compartilhado de
  "criadoras" (Leads + Propostas de UGC)

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
- `prisma/schema.prisma` — tabelas do Financeiro.

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
- Construção dos módulos Leads de criadoras, Propostas de UGC e Feedbacks —
  cada um em uma conversa separada, conforme o documento de arquitetura.
