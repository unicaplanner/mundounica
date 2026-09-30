# Mundo da Unica — Hub

Casca do "Mundo da Unica" (Fase 1): tela de login + menu que lista as
ferramentas da Unica Planner. Por enquanto so um item do menu e ativo —
**Central de Produção** — apontando para o sistema existente (que continua
com seu proprio login separado, sem nenhuma alteração). Os demais modulos
(Leads de criadoras, Propostas de UGC, Feedbacks e ideias de produto)
aparecem como "em breve": a navegação ja prevê o espaço, o conteúdo vem
depois, em conversas separadas.

Ver [`../Arquitetura - Mundo da Unica.md`](../Arquitetura%20-%20Mundo%20da%20Unica.md)
para a visão completa da plataforma e o plano das próximas fases.

## Stack

- **Next.js** (App Router) na Vercel
- **Supabase Auth** — login por email/senha, usuária única (a Lari)
- Este mesmo projeto Supabase sera reaproveitado depois para hospedar o banco
  compartilhado de "criadoras" (Leads + Propostas de UGC)

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
5. Instale as dependências e rode o app:

   ```bash
   npm install
   npm run dev
   ```

## Deploy

1. Suba o repositório pro GitHub.
2. Na Vercel, importe o repositório (ou use o MCP `create_git_project`).
3. Configure as três variáveis de ambiente do passo 4 acima nas Environment
   Variables do projeto (Production **e** Preview).

## Estrutura

- `src/proxy.ts` — redireciona para `/login` quem não está autenticado (e
  vice-versa); renova a sessão da Supabase a cada request. No Next.js 16,
  `proxy.ts` substitui o antigo `middleware.ts`.
- `src/lib/supabase/client.ts` / `server.ts` — clientes Supabase para
  browser e para Server Components/Actions.
- `src/app/login/` — tela e Server Action de login.
- `src/app/page.tsx` — hub/menu com os módulos.
- `src/app/actions.ts` — Server Action de logout.

## Próximas fases (fora de escopo agora)

- **Fase 2**: login único também para a Central de Produção e para os
  módulos futuros (Supabase Auth substitui a senha própria de cada um).
- Construção dos módulos Leads de criadoras, Propostas de UGC e Feedbacks —
  cada um em uma conversa separada, conforme o documento de arquitetura.
