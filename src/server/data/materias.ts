import "server-only";

import { prisma } from "@/lib/prisma";
import type { AjusteMateria } from "@/lib/validacao/materia";

export async function listMateriasAjustes(userId: string, concursoId: string) {
  return prisma.materia.findMany({
    where: { concursoId, concurso: { userId } },
    orderBy: { ordem: "asc" },
    select: {
      id: true,
      nome: true,
      peso: true,
      prioridade: true,
      _count: { select: { topicos: true } },
    },
  });
}

export type MateriaAjustes = Awaited<
  ReturnType<typeof listMateriasAjustes>
>[number];

/** Retorna o id do concurso, ou `null` se a matéria não for do usuário. */
export async function ajustarMateria(
  userId: string,
  materiaId: string,
  ajuste: AjusteMateria,
) {
  const materia = await prisma.materia.findFirst({
    where: { id: materiaId, concurso: { userId } },
    select: { concursoId: true },
  });
  if (!materia) return null;
  await prisma.materia.update({ where: { id: materiaId }, data: ajuste });
  return materia.concursoId;
}

/** Aplica a nova ordem; exige exatamente as matérias atuais do concurso. */
export async function reordenarMaterias(
  userId: string,
  concursoId: string,
  ids: string[],
) {
  return prisma.$transaction(async (tx) => {
    const atuais = await tx.materia.findMany({
      where: { concursoId, concurso: { userId } },
      select: { id: true },
    });
    const conjunto = new Set(atuais.map((m) => m.id));
    if (
      ids.length !== conjunto.size ||
      new Set(ids).size !== ids.length ||
      !ids.every((id) => conjunto.has(id))
    ) {
      return false;
    }
    for (const [ordem, id] of ids.entries()) {
      await tx.materia.update({ where: { id }, data: { ordem } });
    }
    return true;
  });
}
