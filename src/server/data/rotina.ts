import "server-only";

import { prisma } from "@/lib/prisma";
import type { RotinaInput } from "@/lib/validacao/rotina";

const camposRotina = {
  diasSemana: true,
  inicioMinutos: true,
  minutosPorDia: true,
  duracaoBloco: true,
  pausa: true,
} as const;

/** `null` se o usuário ainda não definiu a rotina. */
export async function getRotina(userId: string) {
  return prisma.rotina.findUnique({
    where: { userId },
    select: camposRotina,
  });
}

export type Rotina = NonNullable<Awaited<ReturnType<typeof getRotina>>>;

export async function salvarRotina(userId: string, data: RotinaInput) {
  await prisma.rotina.upsert({
    where: { userId },
    create: { ...data, userId },
    update: data,
  });
}
