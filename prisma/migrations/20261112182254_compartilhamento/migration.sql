-- CreateTable
CREATE TABLE "Compartilhamento" (
    "id" TEXT NOT NULL,
    "concursoId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Compartilhamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Copia" (
    "id" TEXT NOT NULL,
    "compartilhamentoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Copia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Compartilhamento_concursoId_key" ON "Compartilhamento"("concursoId");

-- CreateIndex
CREATE UNIQUE INDEX "Compartilhamento_token_key" ON "Compartilhamento"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Copia_compartilhamentoId_userId_key" ON "Copia"("compartilhamentoId", "userId");

-- AddForeignKey
ALTER TABLE "Compartilhamento" ADD CONSTRAINT "Compartilhamento_concursoId_fkey" FOREIGN KEY ("concursoId") REFERENCES "Concurso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Copia" ADD CONSTRAINT "Copia_compartilhamentoId_fkey" FOREIGN KEY ("compartilhamentoId") REFERENCES "Compartilhamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Copia" ADD CONSTRAINT "Copia_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
