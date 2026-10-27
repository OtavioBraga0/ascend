import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import * as concursos from "@/server/data/concursos";
import {
  getEstruturaEdital,
  getResumoEdital,
  salvarEdital,
} from "@/server/data/edital";
import {
  ajustarMateria,
  listMateriasAjustes,
  reordenarMaterias,
} from "@/server/data/materias";
import { getMateriasPainel, getProgressoConcursos } from "@/server/data/painel";
import {
  atualizarDetalhesTopico,
  atualizarStatusTopico,
  getEdital,
} from "@/server/data/topicos";

/**
 * Critério de aceite: um usuário nunca vê nem altera dados de outro, mesmo
 * trocando ids. Cada função de acesso a dados é chamada como B com ids de A.
 */
const sufixo = randomUUID();
let userA: string, userB: string, concursoA: string, concursoB: string;
let materiaA: string, topicoA: string;

beforeAll(async () => {
  [userA, userB] = await Promise.all(
    ["a", "b"].map(async (nome) => {
      const user = await prisma.user.create({
        data: { email: `${nome}-${sufixo}@teste.local` },
      });
      return user.id;
    }),
  );
  const a = await prisma.concurso.create({
    data: {
      userId: userA,
      nome: "Concurso de A",
      materias: {
        create: {
          nome: "Português",
          ordem: 0,
          topicos: {
            create: {
              titulo: "Crase",
              ordem: 0,
              status: "TEORIA",
              nota: "nota de A",
            },
          },
        },
      },
    },
    select: {
      id: true,
      materias: { select: { id: true, topicos: { select: { id: true } } } },
    },
  });
  concursoA = a.id;
  materiaA = a.materias[0].id;
  topicoA = a.materias[0].topicos[0].id;
  concursoB = (
    await prisma.concurso.create({
      data: { userId: userB, nome: "Concurso de B" },
    })
  ).id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: [userA, userB] } } });
  await prisma.$disconnect();
});

async function estadoDeA() {
  return prisma.concurso.findUnique({
    where: { id: concursoA },
    select: {
      nome: true,
      materias: {
        select: {
          id: true,
          nome: true,
          peso: true,
          prioridade: true,
          ordem: true,
          topicos: {
            select: {
              id: true,
              titulo: true,
              status: true,
              nota: true,
              links: true,
            },
          },
        },
      },
    },
  });
}

describe("isolamento entre usuários", () => {
  it("B não lê nada de A", async () => {
    expect(await concursos.getConcurso(userB, concursoA)).toBeNull();
    expect((await concursos.listConcursos(userB)).map((c) => c.id)).toEqual([
      concursoB,
    ]);
    expect(await getEdital(userB, concursoA)).toEqual([]);
    expect(await getEstruturaEdital(userB, concursoA)).toEqual([]);
    expect(await getMateriasPainel(userB, concursoA)).toEqual([]);
    expect(await listMateriasAjustes(userB, concursoA)).toEqual([]);
    expect(await getResumoEdital(userB, concursoA)).toEqual({
      materias: 0,
      topicos: 0,
    });
    expect((await getProgressoConcursos(userB)).has(concursoA)).toBe(false);
  });

  it("B não altera nada de A, e nada muda no banco", async () => {
    const antes = await estadoDeA();

    expect(
      await concursos.updateConcurso(userB, concursoA, {
        nome: "Invadido",
        banca: null,
        cargo: null,
        dataProva: null,
        cor: "rose",
      }),
    ).toBe(false);
    expect(await atualizarStatusTopico(userB, topicoA, "REVISADO")).toBeNull();
    expect(
      await atualizarDetalhesTopico(userB, topicoA, {
        status: "REVISADO",
        nota: "x",
        links: [],
      }),
    ).toBeNull();
    expect(
      await ajustarMateria(userB, materiaA, { peso: 5, prioridade: "ALTA" }),
    ).toBeNull();
    expect(await reordenarMaterias(userB, concursoA, [materiaA])).toBe(false);
    expect(
      await salvarEdital(userB, concursoA, [
        { nome: "X", peso: 1, topicos: [{ titulo: "Y" }] },
      ]),
    ).toBeNull();
    expect(await concursos.deleteConcurso(userB, concursoA)).toBe(false);

    expect(await estadoDeA()).toEqual(antes);
  });

  it("ids de A enviados no edital de B viram itens novos, sem mover os de A", async () => {
    const antes = await estadoDeA();
    const resultado = await salvarEdital(userB, concursoB, [
      {
        id: materiaA,
        nome: "Português",
        peso: 1,
        topicos: [{ id: topicoA, titulo: "Crase" }],
      },
    ]);
    expect(resultado).toEqual({ mantidos: 0 });

    const deB = await getEstruturaEdital(userB, concursoB);
    expect(deB).toHaveLength(1);
    expect(deB[0].id).not.toBe(materiaA);
    expect(deB[0].topicos[0].id).not.toBe(topicoA);
    expect(await estadoDeA()).toEqual(antes);
  });

  it("A continua alterando os próprios dados", async () => {
    expect(await atualizarStatusTopico(userA, topicoA, "REVISADO")).toBe(
      concursoA,
    );
    expect(await concursos.deleteConcurso(userA, concursoA)).toBe(true);
  });
});
