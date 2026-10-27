-- CreateEnum
CREATE TYPE "Prioridade" AS ENUM ('BAIXA', 'MEDIA', 'ALTA');

-- CreateEnum
CREATE TYPE "StatusTopico" AS ENUM ('NAO_INICIADO', 'TEORIA', 'EXERCICIOS', 'REVISADO');

-- CreateTable
CREATE TABLE "Concurso" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "banca" TEXT,
    "cargo" TEXT,
    "dataProva" DATE,
    "cor" TEXT NOT NULL DEFAULT 'blue',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Concurso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Materia" (
    "id" TEXT NOT NULL,
    "concursoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "peso" INTEGER NOT NULL DEFAULT 1,
    "prioridade" "Prioridade" NOT NULL DEFAULT 'MEDIA',
    "ordem" INTEGER NOT NULL,

    CONSTRAINT "Materia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topico" (
    "id" TEXT NOT NULL,
    "materiaId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "status" "StatusTopico" NOT NULL DEFAULT 'NAO_INICIADO',
    "nota" TEXT,
    "links" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Concurso_userId_idx" ON "Concurso"("userId");

-- CreateIndex
CREATE INDEX "Materia_concursoId_idx" ON "Materia"("concursoId");

-- CreateIndex
CREATE INDEX "Topico_materiaId_idx" ON "Topico"("materiaId");

-- AddForeignKey
ALTER TABLE "Concurso" ADD CONSTRAINT "Concurso_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Materia" ADD CONSTRAINT "Materia_concursoId_fkey" FOREIGN KEY ("concursoId") REFERENCES "Concurso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topico" ADD CONSTRAINT "Topico_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "Materia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
