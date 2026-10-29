import "server-only";

import { prisma } from "@/lib/prisma";

/** Matérias do concurso com o necessário para o painel. */
export async function getMateriasPainel(userId: string, concursoId: string) {
  return prisma.materia.findMany({
    where: { concursoId, concurso: { userId } },
    orderBy: { ordem: "asc" },
    select: {
      id: true,
      nome: true,
      peso: true,
      prioridade: true,
      dificuldade: true,
      ordem: true,
      topicos: {
        select: {
          id: true,
          titulo: true,
          status: true,
          ordem: true,
          dificuldade: true,
        },
      },
    },
  });
}

export type MateriaPainel = Awaited<
  ReturnType<typeof getMateriasPainel>
>[number];

/** Peso e status de cada matéria de cada concurso, para os anéis da lista. */
export async function getProgressoConcursos(userId: string) {
  const materias = await prisma.materia.findMany({
    where: { concurso: { userId } },
    select: {
      concursoId: true,
      peso: true,
      topicos: { select: { status: true } },
    },
  });
  const porConcurso = new Map<string, typeof materias>();
  for (const materia of materias) {
    porConcurso.set(materia.concursoId, [
      ...(porConcurso.get(materia.concursoId) ?? []),
      materia,
    ]);
  }
  return porConcurso;
}
