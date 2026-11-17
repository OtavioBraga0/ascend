-- CreateTable
CREATE TABLE "UsoIA" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "modelo" TEXT,
    "sucesso" BOOLEAN NOT NULL,
    "erro" TEXT,
    "caracteres" INTEGER NOT NULL,
    "tokensEntrada" INTEGER,
    "tokensSaida" INTEGER,
    "custoUsd" DECIMAL(10,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsoIA_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UsoIA_userId_createdAt_idx" ON "UsoIA"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "UsoIA" ADD CONSTRAINT "UsoIA_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

