-- Parcerias + Marketing (calendario): cria so as tabelas novas, nao altera nem
-- apaga nada que ja existe. Gerado com prisma migrate diff (HEAD 8fd9362 ->
-- schema atual). Rodar UMA vez em producao:
--   npx prisma db execute --file prisma/sql/2026-10-20-parcerias-e-marketing.sql
-- com a DATABASE_URL de producao (?schema=financeiro).

-- CreateEnum
CREATE TYPE "StatusCriadora" AS ENUM ('nova', 'pra_contatar', 'contatada', 'respondeu', 'negociando', 'fechada', 'nao_seguiu', 'descartada');

-- CreateEnum
CREATE TYPE "OrigemCriadora" AS ENUM ('prospeccao', 'proposta', 'indicacao');

-- CreateEnum
CREATE TYPE "TipoAcordo" AS ENUM ('presente', 'permuta', 'pago', 'afiliada');

-- CreateEnum
CREATE TYPE "Recomendacao" AS ENUM ('aprovar', 'investigar', 'recusar');

-- CreateEnum
CREATE TYPE "MktCanal" AS ENUM ('stories', 'instagram', 'tiktok', 'youtube', 'email', 'blog');

-- CreateEnum
CREATE TYPE "MktNivel" AS ENUM ('realista', 'extra');

-- CreateEnum
CREATE TYPE "MktStatus" AS ENUM ('roteiro', 'ajustar', 'aprovado', 'gravado', 'publicado');

-- CreateTable
CREATE TABLE "Campanha" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "inicio" TIMESTAMP(3),
    "fim" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campanha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TarefaCampanha" (
    "id" TEXT NOT NULL,
    "campanhaId" TEXT NOT NULL,
    "fase" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "dica" TEXT,
    "responsavel" TEXT,
    "feita" BOOLEAN NOT NULL DEFAULT false,
    "posicao" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TarefaCampanha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Criadora" (
    "id" TEXT NOT NULL,
    "nome" TEXT,
    "nomeCompleto" TEXT,
    "instagram" TEXT,
    "tiktok" TEXT,
    "youtube" TEXT,
    "linkOrigem" TEXT,
    "seguidoresInstagram" INTEGER,
    "seguidoresTiktok" INTEGER,
    "seguidoresYoutube" INTEGER,
    "nicho" TEXT,
    "motivo" TEXT,
    "alerta" TEXT,
    "observacoes" TEXT,
    "gancho" TEXT,
    "origem" "OrigemCriadora" NOT NULL DEFAULT 'prospeccao',
    "status" "StatusCriadora" NOT NULL DEFAULT 'nova',
    "statusEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "campanhaId" TEXT,
    "lote" INTEGER,
    "kit" TEXT,
    "email" TEXT,
    "whatsapp" TEXT,
    "endereco" TEXT,
    "acordo" "TipoAcordo",
    "valorCombinado" DECIMAL(10,2),
    "comissaoPct" DECIMAL(5,2),
    "pago" BOOLEAN NOT NULL DEFAULT false,
    "pagoEm" TIMESTAMP(3),
    "autorizaAnuncio" BOOLEAN NOT NULL DEFAULT false,
    "anuncioAte" TIMESTAMP(3),
    "cupom" TEXT,
    "cupomPedidos" INTEGER,
    "cupomVendas" DECIMAL(12,2),
    "cupomAtualizadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Criadora_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroCriadora" (
    "id" TEXT NOT NULL,
    "criadoraId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "texto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroCriadora_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropostaUgc" (
    "id" TEXT NOT NULL,
    "criadoraId" TEXT NOT NULL,
    "recebidaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "texto" TEXT NOT NULL,
    "pedido" TEXT,
    "valorPedido" DECIMAL(10,2),
    "checklist" JSONB,
    "recomendacao" "Recomendacao",
    "justificativa" TEXT,
    "perguntas" TEXT,
    "analisadaPor" TEXT,
    "analisadaEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropostaUgc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnvioParceria" (
    "id" TEXT NOT NULL,
    "criadoraId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rastreio" TEXT,
    "custoFrete" DECIMAL(10,2),
    "entregueEm" TIMESTAMP(3),
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnvioParceria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemEnvioParceria" (
    "id" TEXT NOT NULL,
    "envioId" TEXT NOT NULL,
    "varianteId" TEXT,
    "descricao" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "custoUnitario" DECIMAL(10,2),

    CONSTRAINT "ItemEnvioParceria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntregaParceria" (
    "id" TEXT NOT NULL,
    "criadoraId" TEXT NOT NULL,
    "formato" TEXT NOT NULL,
    "prazo" TIMESTAMP(3),
    "publicadoEm" TIMESTAMP(3),
    "link" TEXT,
    "sinalizou" BOOLEAN NOT NULL DEFAULT false,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntregaParceria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemProducaoParceria" (
    "id" TEXT NOT NULL,
    "criadoraId" TEXT NOT NULL,
    "etapa" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "feito" BOOLEAN NOT NULL DEFAULT false,
    "feitoEm" TIMESTAMP(3),
    "posicao" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemProducaoParceria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RespostaFormulario" (
    "id" TEXT NOT NULL,
    "criadoraId" TEXT,
    "enviadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "instagram" TEXT,
    "respostas" JSONB NOT NULL,
    "chave" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RespostaFormulario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModeloMensagem" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "posicao" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModeloMensagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MktLote" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "foco" TEXT,
    "inicio" DATE NOT NULL,
    "fim" DATE NOT NULL,
    "pastaDriveUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MktLote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MktConteudo" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "horario" TEXT,
    "canal" "MktCanal" NOT NULL,
    "formato" TEXT NOT NULL,
    "nivel" "MktNivel" NOT NULL,
    "pilar" TEXT,
    "campanha" TEXT,
    "titulo" TEXT NOT NULL,
    "objetivo" TEXT,
    "gancho" TEXT,
    "roteiro" JSONB,
    "legenda" TEXT,
    "cta" TEXT,
    "hashtags" TEXT,
    "producao" TEXT,
    "produtos" TEXT,
    "reaproveita" TEXT,
    "observacao" TEXT,
    "status" "MktStatus" NOT NULL DEFAULT 'roteiro',
    "notaLari" TEXT,
    "linkPublicado" TEXT,
    "statusEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MktConteudo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MktTarefa" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "detalhe" TEXT,
    "tipo" TEXT NOT NULL,
    "prazo" DATE,
    "link" TEXT,
    "linkRotulo" TEXT,
    "conteudoId" TEXT,
    "feita" BOOLEAN NOT NULL DEFAULT false,
    "feitaEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MktTarefa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Campanha_nome_key" ON "Campanha"("nome");

-- CreateIndex
CREATE INDEX "TarefaCampanha_campanhaId_idx" ON "TarefaCampanha"("campanhaId");

-- CreateIndex
CREATE UNIQUE INDEX "Criadora_instagram_key" ON "Criadora"("instagram");

-- CreateIndex
CREATE UNIQUE INDEX "Criadora_cupom_key" ON "Criadora"("cupom");

-- CreateIndex
CREATE INDEX "Criadora_status_idx" ON "Criadora"("status");

-- CreateIndex
CREATE INDEX "Criadora_campanhaId_idx" ON "Criadora"("campanhaId");

-- CreateIndex
CREATE INDEX "RegistroCriadora_criadoraId_idx" ON "RegistroCriadora"("criadoraId");

-- CreateIndex
CREATE INDEX "PropostaUgc_criadoraId_idx" ON "PropostaUgc"("criadoraId");

-- CreateIndex
CREATE INDEX "EnvioParceria_criadoraId_idx" ON "EnvioParceria"("criadoraId");

-- CreateIndex
CREATE INDEX "ItemEnvioParceria_envioId_idx" ON "ItemEnvioParceria"("envioId");

-- CreateIndex
CREATE INDEX "EntregaParceria_criadoraId_idx" ON "EntregaParceria"("criadoraId");

-- CreateIndex
CREATE INDEX "ItemProducaoParceria_criadoraId_idx" ON "ItemProducaoParceria"("criadoraId");

-- CreateIndex
CREATE INDEX "ItemProducaoParceria_etapa_feito_idx" ON "ItemProducaoParceria"("etapa", "feito");

-- CreateIndex
CREATE UNIQUE INDEX "RespostaFormulario_chave_key" ON "RespostaFormulario"("chave");

-- CreateIndex
CREATE UNIQUE INDEX "MktLote_numero_key" ON "MktLote"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "MktConteudo_codigo_key" ON "MktConteudo"("codigo");

-- CreateIndex
CREATE INDEX "MktConteudo_loteId_data_idx" ON "MktConteudo"("loteId", "data");

-- CreateIndex
CREATE UNIQUE INDEX "MktTarefa_codigo_key" ON "MktTarefa"("codigo");

-- AddForeignKey
ALTER TABLE "TarefaCampanha" ADD CONSTRAINT "TarefaCampanha_campanhaId_fkey" FOREIGN KEY ("campanhaId") REFERENCES "Campanha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Criadora" ADD CONSTRAINT "Criadora_campanhaId_fkey" FOREIGN KEY ("campanhaId") REFERENCES "Campanha"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroCriadora" ADD CONSTRAINT "RegistroCriadora_criadoraId_fkey" FOREIGN KEY ("criadoraId") REFERENCES "Criadora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropostaUgc" ADD CONSTRAINT "PropostaUgc_criadoraId_fkey" FOREIGN KEY ("criadoraId") REFERENCES "Criadora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvioParceria" ADD CONSTRAINT "EnvioParceria_criadoraId_fkey" FOREIGN KEY ("criadoraId") REFERENCES "Criadora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemEnvioParceria" ADD CONSTRAINT "ItemEnvioParceria_envioId_fkey" FOREIGN KEY ("envioId") REFERENCES "EnvioParceria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemEnvioParceria" ADD CONSTRAINT "ItemEnvioParceria_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "Variante"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaParceria" ADD CONSTRAINT "EntregaParceria_criadoraId_fkey" FOREIGN KEY ("criadoraId") REFERENCES "Criadora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemProducaoParceria" ADD CONSTRAINT "ItemProducaoParceria_criadoraId_fkey" FOREIGN KEY ("criadoraId") REFERENCES "Criadora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RespostaFormulario" ADD CONSTRAINT "RespostaFormulario_criadoraId_fkey" FOREIGN KEY ("criadoraId") REFERENCES "Criadora"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MktConteudo" ADD CONSTRAINT "MktConteudo_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "MktLote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MktTarefa" ADD CONSTRAINT "MktTarefa_conteudoId_fkey" FOREIGN KEY ("conteudoId") REFERENCES "MktConteudo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

