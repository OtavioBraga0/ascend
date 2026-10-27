import "server-only";

import { prisma } from "@/lib/prisma";
import type { EditalInput } from "@/lib/validacao/edital";

export async function getResumoEdital(userId: string, concursoId: string) {
  const [materias, topicos] = await Promise.all([
    prisma.materia.count({ where: { concursoId, concurso: { userId } } }),
    prisma.topico.count({
      where: { materia: { concursoId, concurso: { userId } } },
    }),
  ]);
  return { materias, topicos };
}

export type ResultadoSalvarEdital = "ok" | "nao-encontrado" | "ja-importado";

/** Grava matérias e tópicos em uma única transação. */
export async function salvarEdital(
  userId: string,
  concursoId: string,
  materias: EditalInput,
): Promise<ResultadoSalvarEdital> {
  return prisma.$transaction(async (tx) => {
    const concurso = await tx.concurso.findFirst({
      where: { id: concursoId, userId },
      select: { _count: { select: { materias: true } } },
    });
    if (!concurso) return "nao-encontrado";
    // A reimportação (substituindo o edital atual) fica nos ajustes do concurso.
    if (concurso._count.materias > 0) return "ja-importado";

    const criadas = await tx.materia.createManyAndReturn({
      data: materias.map((materia, ordem) => ({
        concursoId,
        nome: materia.nome,
        peso: materia.peso,
        ordem,
      })),
      select: { id: true, ordem: true },
    });
    const idPorOrdem = new Map(criadas.map((m) => [m.ordem, m.id]));

    await tx.topico.createMany({
      data: materias.flatMap((materia, ordemMateria) =>
        materia.topicos.map((titulo, ordem) => ({
          materiaId: idPorOrdem.get(ordemMateria)!,
          titulo,
          ordem,
        })),
      ),
    });
    return "ok";
  });
}
