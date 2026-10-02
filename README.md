# Mundo da Unica — Hub

Casca do "Mundo da Unica": tela de login + menu que lista as ferramentas da
Unica Planner. Módulos ativos:

- **Central de Produção** — link pro sistema existente (que continua com seu
  próprio login separado, sem nenhuma alteração).
- **Financeiro** (`/financeiro`) — módulo interno, mesmo login do Mundo da
  Unica. Fase 1: precificador (ficha técnica de materiais por produto,
  registro de compras que atualiza o custo dos materiais, preço sugerido).

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
- **Shopify Admin API** (só leitura de produtos) para o catálogo do Financeiro
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
- `src/app/financeiro/` — telas do Financeiro (produtos, ficha técnica,
  materiais, compras); `src/app/api/financeiro/` — rotas que gravam dados
  (cada uma confere o login de novo, além do proxy).
- `src/lib/financeiro/` — sync com o Shopify, cálculo de custo, consultas.
- `prisma/schema.prisma` — tabelas do Financeiro.

### Regras do Financeiro

- Custo de produção própria = soma(quantidade de cada material na ficha ×
  custo atual do material). Revenda = custo de compra informado.
- O custo atual de um material é sempre o da **compra mais recente pela data
  da compra** — lançar uma compra antiga depois não "volta" o preço.
- O sync com o Shopify só atualiza título, status e link; nunca mexe em
  classificação, custo ou ficha técnica.
- Ainda não há baixa de estoque por venda: "total já comprado" é só a soma
  das compras.

## Próximas fases (fora de escopo agora)

- **Fase 2**: login único também para a Central de Produção e para os
  módulos futuros (Supabase Auth substitui a senha própria de cada um).
- Construção dos módulos Leads de criadoras, Propostas de UGC e Feedbacks —
  cada um em uma conversa separada, conforme o documento de arquitetura.
