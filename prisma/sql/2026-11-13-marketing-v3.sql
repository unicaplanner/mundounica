-- Marketing v3 (12/11): arquivar sem apagar, perfil do post e status "a escrever".
-- So acrescenta. Rodar UMA vez em producao (?schema=financeiro):
--   npx prisma db execute --file prisma/sql/2026-11-13-marketing-v3.sql

-- AlterEnum
ALTER TYPE "MktStatus" ADD VALUE 'ideia';

-- AlterTable
ALTER TABLE "MktConteudo" ADD COLUMN     "arquivadoEm" TIMESTAMP(3),
ADD COLUMN     "perfil" TEXT;

-- AlterTable
ALTER TABLE "MktTarefa" ADD COLUMN     "arquivadoEm" TIMESTAMP(3);

