/**
 * Cria um concurso de exemplo (Escrevente do MP) para o usuário do email
 * SEED_EMAIL. Pode ser rodado de novo: recria o concurso de exemplo.
 *
 *   SEED_EMAIL=voce@email.com npm run db:seed
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import {
  PrismaClient,
  type Dificuldade,
  type StatusTopico,
} from "../src/generated/prisma/client";

const NOME_EXEMPLO = "Escrevente — Ministério Público (exemplo)";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type MateriaSeed = {
  nome: string;
  peso: number;
  prioridade: "ALTA" | "MEDIA" | "BAIXA";
  dificuldade?: Dificuldade;
  topicos: [titulo: string, status?: StatusTopico][];
};

// Tópicos de exemplo, no estilo de um conteúdo programático real.
const MATERIAS: MateriaSeed[] = [
  {
    nome: "Língua Portuguesa",
    peso: 3,
    prioridade: "ALTA",
    topicos: [
      ["Leitura e interpretação de textos", "REVISADO"],
      ["Sinônimos e antônimos", "REVISADO"],
      ["Pontuação", "EXERCICIOS"],
      ["Classes de palavras", "EXERCICIOS"],
      ["Concordância verbal e nominal", "TEORIA"],
      ["Regência verbal e nominal", "TEORIA"],
      ["Colocação pronominal"],
      ["Crase"],
    ],
  },
  {
    nome: "Matemática",
    peso: 1,
    prioridade: "MEDIA",
    dificuldade: "DIFICIL",
    topicos: [
      ["Operações com números reais", "REVISADO"],
      ["Razão e proporção", "EXERCICIOS"],
      ["Porcentagem", "TEORIA"],
      ["Regra de três simples e composta"],
      ["Juro simples"],
    ],
  },
  {
    nome: "Noções de Informática",
    peso: 1,
    prioridade: "BAIXA",
    dificuldade: "FACIL",
    topicos: [
      ["Windows: pastas, arquivos e atalhos", "TEORIA"],
      ["Word: edição e formatação de textos"],
      ["Excel: fórmulas e funções básicas"],
      ["Correio eletrônico"],
    ],
  },
  {
    nome: "Noções de Direito Constitucional",
    peso: 2,
    prioridade: "ALTA",
    topicos: [
      ["Princípios fundamentais (arts. 1º ao 4º)", "EXERCICIOS"],
      ["Direitos e garantias fundamentais (art. 5º)", "TEORIA"],
      ["Administração Pública (arts. 37 a 41)"],
      ["Funções essenciais à Justiça: Ministério Público"],
    ],
  },
  {
    nome: "Noções de Direito Administrativo",
    peso: 2,
    prioridade: "MEDIA",
    topicos: [
      ["Atos administrativos"],
      ["Poderes administrativos"],
      ["Improbidade administrativa (Lei nº 8.429/1992)"],
    ],
  },
  {
    nome: "Legislação Institucional",
    peso: 2,
    prioridade: "MEDIA",
    topicos: [
      ["Lei Orgânica do Ministério Público do Estado (exemplo)"],
      ["Estatuto dos servidores: direitos e deveres"],
    ],
  },
];

async function main() {
  const email = (process.env.SEED_EMAIL ?? "voce@exemplo.com")
    .trim()
    .toLowerCase();

  // O Auth.js reaproveita o usuário pelo email no primeiro login.
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email },
    select: { id: true },
  });

  // Não sobrescreve a rotina de quem já definiu a sua.
  await prisma.rotina.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      diasSemana: [1, 2, 3, 4, 5],
      inicioMinutos: 19 * 60,
      minutosPorDia: 3 * 60,
    },
  });

  const dataProva = new Date();
  dataProva.setUTCHours(0, 0, 0, 0);
  dataProva.setUTCDate(dataProva.getUTCDate() + 120);

  await prisma.$transaction(async (tx) => {
    await tx.concurso.deleteMany({
      where: { userId: user.id, nome: NOME_EXEMPLO },
    });
    await tx.concurso.create({
      data: {
        userId: user.id,
        nome: NOME_EXEMPLO,
        banca: "Vunesp",
        cargo: "Oficial de Promotoria",
        dataProva,
        cor: "violet",
        materias: {
          create: MATERIAS.map((materia, ordem) => ({
            nome: materia.nome,
            peso: materia.peso,
            prioridade: materia.prioridade,
            dificuldade: materia.dificuldade,
            ordem,
            topicos: {
              create: materia.topicos.map(
                ([titulo, status = "NAO_INICIADO"], ordemTopico) => ({
                  titulo,
                  status,
                  ordem: ordemTopico,
                }),
              ),
            },
          })),
        },
      },
    });
  });

  const topicos = MATERIAS.reduce((total, m) => total + m.topicos.length, 0);
  console.log(
    `Concurso de exemplo criado para ${email}: ${MATERIAS.length} matérias, ${topicos} tópicos.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
