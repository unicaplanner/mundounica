-- Marketing: link da arte no Canva em cada conteudo do calendario.
-- So acrescenta uma coluna. Rodar UMA vez em producao (?schema=financeiro):
--   npx prisma db execute --file prisma/sql/2026-11-09-link-canva.sql

ALTER TABLE "MktConteudo" ADD COLUMN "linkCanva" TEXT;
