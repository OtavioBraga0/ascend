import "server-only";

import { prisma } from "@/lib/prisma";

export type TipoUsoIA = "extracao_edital";

const DIA_MS = 24 * 60 * 60 * 1000;

/** Momentos das tentativas do usuário nas últimas 24 h, para o rate limit. */
export async function tentativasRecentes(
  userId: string,
  tipo: TipoUsoIA,
  agora: Date,
): Promise<Date[]> {
  const usos = await prisma.usoIA.findMany({
    where: {
      userId,
      tipo,
      createdAt: { gt: new Date(agora.getTime() - DIA_MS) },
    },
    select: { createdAt: true },
  });
  return usos.map((uso) => uso.createdAt);
}

/**
 * Registra a tentativa antes da chamada, para que chamadas simultâneas já
 * contem no limite. O resultado é gravado depois, em `concluirUso`.
 */
export async function iniciarUso(
  userId: string,
  dados: { tipo: TipoUsoIA; caracteres: number },
) {
  const { id } = await prisma.usoIA.create({
    data: { userId, ...dados, sucesso: false, erro: "em_andamento" },
    select: { id: true },
  });
  return id;
}

export async function concluirUso(
  userId: string,
  id: string,
  dados: {
    sucesso: boolean;
    erro: string | null;
    modelo: string | null;
    tokensEntrada: number | null;
    tokensSaida: number | null;
    custoUsd: number | null;
  },
) {
  await prisma.usoIA.updateMany({ where: { id, userId }, data: dados });
}
