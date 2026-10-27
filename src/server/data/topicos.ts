import "server-only";

import type { StatusTopico } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type { DetalhesTopico } from "@/lib/validacao/topico";

/** Matérias do concurso (na ordem) com seus tópicos. */
export async function getEdital(userId: string, concursoId: string) {
  return prisma.materia.findMany({
    where: { concursoId, concurso: { userId } },
    orderBy: { ordem: "asc" },
    select: {
      id: true,
      nome: true,
      topicos: {
        orderBy: { ordem: "asc" },
        select: {
          id: true,
          titulo: true,
          status: true,
          nota: true,
          links: true,
        },
      },
    },
  });
}

export type MateriaEdital = Awaited<ReturnType<typeof getEdital>>[number];
export type TopicoEdital = MateriaEdital["topicos"][number];

const doUsuario = (userId: string, topicoId: string) => ({
  id: topicoId,
  materia: { concurso: { userId } },
});

/** Retorna o id do concurso, ou `null` se o tópico não for do usuário. */
export async function atualizarStatusTopico(
  userId: string,
  topicoId: string,
  status: StatusTopico,
) {
  return atualizar(userId, topicoId, { status });
}

export async function atualizarDetalhesTopico(
  userId: string,
  topicoId: string,
  detalhes: DetalhesTopico,
) {
  return atualizar(userId, topicoId, detalhes);
}

async function atualizar(
  userId: string,
  topicoId: string,
  data: Partial<DetalhesTopico>,
): Promise<string | null> {
  const topico = await prisma.topico.findFirst({
    where: doUsuario(userId, topicoId),
    select: { materia: { select: { concursoId: true } } },
  });
  if (!topico) return null;
  // O filtro por usuário se repete no update para não depender só da leitura acima.
  const { count } = await prisma.topico.updateMany({
    where: doUsuario(userId, topicoId),
    data,
  });
  return count > 0 ? topico.materia.concursoId : null;
}
