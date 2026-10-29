import "server-only";

import { prisma } from "@/lib/prisma";
import type { ConcursoInput } from "@/lib/validacao/concurso";

const camposConcurso = {
  id: true,
  nome: true,
  banca: true,
  cargo: true,
  dataProva: true,
  cor: true,
} as const;

export type Concurso = NonNullable<Awaited<ReturnType<typeof getConcurso>>>;

export async function listConcursos(userId: string) {
  return prisma.concurso.findMany({
    where: { userId },
    select: camposConcurso,
    orderBy: [
      { dataProva: { sort: "asc", nulls: "last" } },
      { createdAt: "asc" },
    ],
  });
}

/** Ids dos concursos do usuário, para a navegação. */
export async function listConcursoIds(userId: string) {
  const concursos = await prisma.concurso.findMany({
    where: { userId },
    select: { id: true },
  });
  return concursos.map((c) => c.id);
}

/** `null` se o concurso não existir ou não for do usuário. */
export async function getConcurso(userId: string, id: string) {
  return prisma.concurso.findFirst({
    where: { id, userId },
    select: camposConcurso,
  });
}

export async function createConcurso(userId: string, data: ConcursoInput) {
  const { id } = await prisma.concurso.create({
    data: { ...data, userId },
    select: { id: true },
  });
  return id;
}

/** Retorna `false` se o concurso não existir ou não for do usuário. */
export async function updateConcurso(
  userId: string,
  id: string,
  data: ConcursoInput,
) {
  const { count } = await prisma.concurso.updateMany({
    where: { id, userId },
    data,
  });
  return count > 0;
}

export async function deleteConcurso(userId: string, id: string) {
  const { count } = await prisma.concurso.deleteMany({ where: { id, userId } });
  return count > 0;
}
