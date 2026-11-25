-- Marketing: campanhas (MktCampanha), datas da marca (MktData) e a ligacao
-- do post com a campanha (MktConteudo.campanhaId). So acrescenta.
-- Rodar UMA vez em producao (?schema=financeiro):
--   npx prisma db execute --file prisma/sql/2026-11-25-campanhas.sql

-- AlterTable
ALTER TABLE "MktConteudo" ADD COLUMN     "campanhaId" TEXT;

-- CreateTable
CREATE TABLE "MktCampanha" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "oferta" TEXT,
    "descontoPct" DECIMAL(5,2),
    "cupom" TEXT,
    "brinde" TEXT,
    "brindeQtd" INTEGER,
    "quantidade" INTEGER,
    "freteGratisAcima" DECIMAL(10,2),
    "produtos" TEXT,
    "inicio" DATE,
    "fim" DATE,
    "prazoProducaoDias" INTEGER,
    "ultimoDiaPedido" DATE,
    "prazosRegiao" JSONB,
    "arquivadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MktCampanha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MktData" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "inicio" DATE NOT NULL,
    "fim" DATE,
    "nota" TEXT,
    "recorrente" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MktData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MktCampanha_codigo_key" ON "MktCampanha"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "MktData_codigo_key" ON "MktData"("codigo");

-- AddForeignKey
ALTER TABLE "MktConteudo" ADD CONSTRAINT "MktConteudo_campanhaId_fkey" FOREIGN KEY ("campanhaId") REFERENCES "MktCampanha"("id") ON DELETE SET NULL ON UPDATE CASCADE;

