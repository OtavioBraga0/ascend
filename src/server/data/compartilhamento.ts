import "server-only";

import { randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";

/** 128 bits aleatórios: o token é a única chave de acesso ao link. */
function novoToken() {
  return randomBytes(16).toString("base64url");
}

/** Estado do compartilhamento para os ajustes; `null` se nunca compartilhado. */
export async function getCompartilhamento(userId: string, concursoId: string) {
  const compartilhamento = await prisma.compartilhamento.findFirst({
    where: { concursoId, concurso: { userId } },
    select: { token: true, ativo: true, _count: { select: { copias: true } } },
  });
  if (!compartilhamento) return null;
  return {
    token: compartilhamento.token,
    ativo: compartilhamento.ativo,
    copias: compartilhamento._count.copias,
  };
}

export type Compartilhamento = NonNullable<
  Awaited<ReturnType<typeof getCompartilhamento>>
>;

/**
 * Ativa o link e devolve o token: o mesmo se já estava ativo, um novo se
 * estava desativado (o link antigo continua sem funcionar). `null` se o
 * concurso não for do usuário.
 */
export async function ativarCompartilhamento(
  userId: string,
  concursoId: string,
) {
  const concurso = await prisma.concurso.findFirst({
    where: { id: concursoId, userId },
    select: { compartilhamento: { select: { token: true, ativo: true } } },
  });
  if (!concurso) return null;
  if (concurso.compartilhamento?.ativo) return concurso.compartilhamento.token;

  const { token } = await prisma.compartilhamento.upsert({
    where: { concursoId },
    create: { concursoId, token: novoToken() },
    update: { token: novoToken(), ativo: true },
    select: { token: true },
  });
  return token;
}

/** Desativa o link; as cópias já contadas continuam. */
export async function desativarCompartilhamento(
  userId: string,
  concursoId: string,
) {
  const { count } = await prisma.compartilhamento.updateMany({
    where: { concursoId, concurso: { userId } },
    data: { ativo: false },
  });
  return count > 0;
}

/**
 * Estrutura pública de um link ativo, para a pré-visualização. Só traz o que
 * vai na cópia, mais o nome do dono (nunca o email). `null` se o link não
 * existir ou estiver desativado.
 */
export async function getEstruturaCompartilhada(token: string) {
  const compartilhamento = await prisma.compartilhamento.findUnique({
    where: { token },
    select: {
      id: true,
      ativo: true,
      concurso: {
        select: {
          userId: true,
          user: { select: { name: true } },
          nome: true,
          banca: true,
          cargo: true,
          dataProva: true,
          materias: {
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
          },
        },
      },
    },
  });
  if (!compartilhamento?.ativo) return null;
  const { userId, user, ...concurso } = compartilhamento.concurso;
  return {
    compartilhamentoId: compartilhamento.id,
    donoId: userId,
    donoNome: user.name,
    concurso,
  };
}

export type EstruturaCompartilhada = NonNullable<
  Awaited<ReturnType<typeof getEstruturaCompartilhada>>
>;

export async function jaCopiou(userId: string, compartilhamentoId: string) {
  const copia = await prisma.copia.findUnique({
    where: { compartilhamentoId_userId: { compartilhamentoId, userId } },
    select: { id: true },
  });
  return copia !== null;
}

/**
 * Cria na conta do usuário um concurso com a estrutura do link (sem
 * progresso, notas, links nem afinidade) e conta a cópia, uma vez por pessoa.
 */
export async function copiarEstrutura(
  userId: string,
  token: string,
): Promise<{ concursoId: string } | { erro: "indisponivel" | "proprio" }> {
  return prisma.$transaction(
    async (tx) => {
      const origem = await tx.compartilhamento.findUnique({
        where: { token },
        select: {
          id: true,
          ativo: true,
          concurso: {
            select: {
              userId: true,
              nome: true,
              banca: true,
              cargo: true,
              dataProva: true,
              cor: true,
              materias: {
                select: {
                  nome: true,
                  peso: true,
                  ordem: true,
                  topicos: { select: { titulo: true, ordem: true } },
                },
              },
            },
          },
        },
      });
      if (!origem?.ativo) return { erro: "indisponivel" as const };
      const { userId: donoId, materias, ...dados } = origem.concurso;
      if (donoId === userId) return { erro: "proprio" as const };

      const { id } = await tx.concurso.create({
        data: {
          ...dados,
          userId,
          materias: {
            create: materias.map(({ topicos, ...materia }) => ({
              ...materia,
              topicos: { createMany: { data: topicos } },
            })),
          },
        },
        select: { id: true },
      });
      await tx.copia.createMany({
        data: [{ compartilhamentoId: origem.id, userId }],
        skipDuplicates: true,
      });
      return { concursoId: id };
    },
    { timeout: 30_000 },
  );
}
