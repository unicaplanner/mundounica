-- Tarefas (organizador): cria so a tabela nova, nao altera nem apaga nada que
-- ja existe. Gerado com prisma migrate diff. Rodar UMA vez em producao:
--   npx prisma db execute --file prisma/sql/2026-10-26-tarefas.sql
-- com a DATABASE_URL de producao (?schema=financeiro).
-- CreateEnum
CREATE TYPE "TarefaStatus" AS ENUM ('a_fazer', 'em_andamento', 'concluido');

-- CreateTable
CREATE TABLE "Tarefa" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "categoria" TEXT NOT NULL,
    "tags" TEXT[],
    "status" "TarefaStatus" NOT NULL DEFAULT 'a_fazer',
    "prazo" DATE,
    "link" TEXT,
    "checklist" JSONB,
    "concluidaEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tarefa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tarefa_status_idx" ON "Tarefa"("status");

-- CreateIndex
CREATE INDEX "Tarefa_prazo_idx" ON "Tarefa"("prazo");

