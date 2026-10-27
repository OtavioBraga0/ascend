import "server-only";

import { prisma } from "@/lib/prisma";
import { planejarEdital } from "@/lib/sincronizar-edital";
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

/** Estrutura atual (para editar), com os ids que preservam o progresso. */
export async function getEstruturaEdital(userId: string, concursoId: string) {
  return prisma.materia.findMany({
    where: { concursoId, concurso: { userId } },
    orderBy: { ordem: "asc" },
    select: {
      id: true,
      nome: true,
      peso: true,
      topicos: {
        orderBy: { ordem: "asc" },
        select: { id: true, titulo: true },
      },
    },
  });
}

/**
 * Grava a estrutura do edital em uma transação, substituindo a atual.
 * Matérias e tópicos reaproveitados (por id ou por nome/título) mantêm
 * status, anotações, links e prioridade; o que saiu é excluído.
 * Retorna quantos tópicos mantiveram o progresso, ou `null` se o concurso não for do usuário.
 */
export async function salvarEdital(
  userId: string,
  concursoId: string,
  materias: EditalInput,
): Promise<{ mantidos: number } | null> {
  return prisma.$transaction(
    async (tx) => {
      const concurso = await tx.concurso.findFirst({
        where: { id: concursoId, userId },
        select: {
          materias: {
            select: {
              id: true,
              nome: true,
              topicos: { select: { id: true, titulo: true } },
            },
          },
        },
      });
      if (!concurso) return null;

      const plano = planejarEdital(
        {
          materias: concurso.materias,
          topicos: concurso.materias.flatMap((m) => m.topicos),
        },
        materias,
      );

      let mantidos = 0;
      for (const materia of plano.materias) {
        const dados = {
          nome: materia.nome,
          peso: materia.peso,
          ordem: materia.ordem,
        };
        const materiaId = materia.existenteId
          ? (
              await tx.materia.update({
                where: { id: materia.existenteId },
                data: dados,
              })
            ).id
          : (
              await tx.materia.create({
                data: { ...dados, concursoId },
                select: { id: true },
              })
            ).id;

        const novos = [];
        for (const topico of materia.topicos) {
          if (topico.existenteId) {
            mantidos++;
            await tx.topico.update({
              where: { id: topico.existenteId },
              data: { titulo: topico.titulo, ordem: topico.ordem, materiaId },
            });
          } else {
            novos.push({
              titulo: topico.titulo,
              ordem: topico.ordem,
              materiaId,
            });
          }
        }
        if (novos.length > 0) await tx.topico.createMany({ data: novos });
      }

      // Os ids a excluir vêm do próprio concurso (lidos acima), nunca do cliente.
      await tx.topico.deleteMany({
        where: { id: { in: plano.excluirTopicos } },
      });
      await tx.materia.deleteMany({
        where: { id: { in: plano.excluirMaterias } },
      });
      return { mantidos };
    },
    { timeout: 30_000 },
  );
}
