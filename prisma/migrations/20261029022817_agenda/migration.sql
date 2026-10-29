-- CreateEnum
CREATE TYPE "Dificuldade" AS ENUM ('FACIL', 'NEUTRO', 'DIFICIL');

-- AlterTable
ALTER TABLE "Materia" ADD COLUMN     "dificuldade" "Dificuldade" NOT NULL DEFAULT 'NEUTRO';

-- AlterTable
ALTER TABLE "Topico" ADD COLUMN     "dificuldade" "Dificuldade";

-- CreateTable
CREATE TABLE "Rotina" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "diasSemana" INTEGER[],
    "inicioMinutos" INTEGER NOT NULL,
    "minutosPorDia" INTEGER NOT NULL,
    "duracaoBloco" INTEGER NOT NULL DEFAULT 60,
    "pausa" INTEGER NOT NULL DEFAULT 15,

    CONSTRAINT "Rotina_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rotina_userId_key" ON "Rotina"("userId");

-- AddForeignKey
ALTER TABLE "Rotina" ADD CONSTRAINT "Rotina_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
