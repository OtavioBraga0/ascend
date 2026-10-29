import { describe, expect, it } from "vitest";

import type {
  Dificuldade,
  Prioridade,
  StatusTopico,
} from "@/generated/prisma/enums";
import {
  blocosRestantes,
  formatarDuracao,
  formatarHora,
  gerarAgenda,
  horariosDoDia,
  type RotinaAgenda,
} from "@/lib/agenda";
import { isoParaData } from "@/lib/datas";

// 2026-10-26 é uma segunda-feira.
const SEGUNDA = "2026-10-26";

const rotina = (extra: Partial<RotinaAgenda> = {}): RotinaAgenda => ({
  diasSemana: [1, 2, 3, 4, 5],
  inicioMinutos: 14 * 60,
  minutosPorDia: 4 * 60,
  duracaoBloco: 60,
  pausa: 15,
  ...extra,
});

function materia(
  id: string,
  topicos: number | { status?: StatusTopico; dificuldade?: Dificuldade }[],
  extra: {
    peso?: number;
    prioridade?: Prioridade;
    dificuldade?: Dificuldade;
    ordem?: number;
  } = {},
) {
  const lista = typeof topicos === "number" ? Array(topicos).fill({}) : topicos;
  return {
    id,
    nome: id,
    peso: extra.peso ?? 1,
    prioridade: extra.prioridade ?? ("MEDIA" as Prioridade),
    dificuldade: extra.dificuldade ?? ("NEUTRO" as Dificuldade),
    ordem: extra.ordem ?? 0,
    topicos: lista.map(
      (t: { status?: StatusTopico; dificuldade?: Dificuldade }, i: number) => ({
        id: `${id}-${i}`,
        titulo: `${id} ${i}`,
        ordem: i,
        status: t.status ?? ("NAO_INICIADO" as StatusTopico),
        dificuldade: t.dificuldade ?? null,
      }),
    ),
  };
}

describe("horariosDoDia", () => {
  it("separa os blocos pela pausa", () => {
    expect(horariosDoDia(rotina({ minutosPorDia: 180 }))).toEqual([
      { inicio: 840, fim: 900 },
      { inicio: 915, fim: 975 },
      { inicio: 990, fim: 1050 },
    ]);
  });

  it("a sobra vira um bloco menor no fim", () => {
    expect(horariosDoDia(rotina({ minutosPorDia: 90 }))).toEqual([
      { inicio: 840, fim: 900 },
      { inicio: 915, fim: 945 },
    ]);
  });

  it("ignora sobras menores que 15 min", () => {
    expect(
      horariosDoDia(rotina({ minutosPorDia: 60, duracaoBloco: 50 })),
    ).toHaveLength(1);
  });
});

describe("blocosRestantes", () => {
  it.each([
    ["NAO_INICIADO", "DIFICIL", 3],
    ["TEORIA", "DIFICIL", 2],
    ["EXERCICIOS", "DIFICIL", 1],
    ["REVISADO", "DIFICIL", 0],
    ["NAO_INICIADO", "NEUTRO", 2],
    ["TEORIA", "NEUTRO", 2],
    ["EXERCICIOS", "NEUTRO", 1],
    ["NAO_INICIADO", "FACIL", 1],
    ["EXERCICIOS", "FACIL", 1],
    ["REVISADO", "FACIL", 0],
  ] as const)("%s, %s → %d", (status, dificuldade, esperado) => {
    expect(blocosRestantes(status, dificuldade)).toBe(esperado);
  });
});

describe("gerarAgenda", () => {
  it("só usa os dias da rotina, a partir de hoje", () => {
    const agenda = gerarAgenda({
      rotina: rotina({ diasSemana: [3, 6] }),
      materias: [materia("a", 10)],
      hoje: SEGUNDA,
    });
    expect(agenda.dias.map((d) => d.data)).toEqual([
      "2026-10-28",
      "2026-10-31",
      "2026-11-04",
      "2026-11-07",
    ]);
  });

  it("não repete a mesma matéria em blocos seguidos", () => {
    const agenda = gerarAgenda({
      rotina: rotina(),
      materias: [materia("a", 20, { peso: 5 }), materia("b", 20)],
      hoje: SEGUNDA,
    });
    for (const dia of agenda.dias) {
      dia.blocos.forEach((bloco, i) => {
        if (i > 0)
          expect(bloco.materiaId).not.toBe(dia.blocos[i - 1].materiaId);
      });
    }
  });

  it("dá mais blocos às matérias de maior peso e mais difíceis", () => {
    const agenda = gerarAgenda({
      rotina: rotina(),
      materias: [
        materia("leve", 50, { peso: 1, dificuldade: "FACIL" }),
        materia("pesada", 50, { peso: 3, dificuldade: "DIFICIL" }),
        materia("media", 50, { peso: 2 }),
      ],
      hoje: SEGUNDA,
    });
    const contagem: Record<string, number> = {};
    for (const bloco of agenda.dias.flatMap((d) => d.blocos))
      contagem[bloco.materiaId] = (contagem[bloco.materiaId] ?? 0) + 1;
    expect(contagem.pesada).toBeGreaterThan(contagem.media);
    expect(contagem.media).toBeGreaterThan(contagem.leve);
  });

  it("segue a ordem do edital e repete o tópico conforme a dificuldade", () => {
    const agenda = gerarAgenda({
      rotina: rotina({ minutosPorDia: 60 }),
      materias: [
        materia("a", [
          { status: "REVISADO" },
          { dificuldade: "DIFICIL", status: "TEORIA" },
          { dificuldade: "FACIL" },
        ]),
      ],
      hoje: SEGUNDA,
    });
    expect(
      agenda.dias.map((d) => [
        d.blocos[0].topicoId,
        d.blocos[0].parte,
        d.blocos[0].partes,
      ]),
    ).toEqual([
      ["a-1", 2, 3],
      ["a-1", 3, 3],
      ["a-2", 1, 1],
    ]);
    expect(agenda.blocosPendentes).toBe(3);
    expect(agenda.termino).toBe("2026-10-28");
  });

  it("limita os dias à janela", () => {
    const agenda = gerarAgenda({
      rotina: rotina(),
      materias: [materia("a", 100)],
      hoje: SEGUNDA,
      janela: 7,
    });
    expect(agenda.dias).toHaveLength(5);
    expect(agenda.termino).not.toBeNull();
  });

  it("conta os blocos que não cabem antes da prova", () => {
    const agenda = gerarAgenda({
      rotina: rotina({ minutosPorDia: 60 }),
      // 10 tópicos neutros = 20 blocos; até quinta (exclusive) cabem 3.
      materias: [materia("a", 10)],
      hoje: SEGUNDA,
      dataProva: isoParaData("2026-10-29"),
    });
    expect(agenda.dias.map((d) => d.data)).toEqual([
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
    ]);
    expect(agenda.blocosSemTempo).toBe(17);
  });

  it("sem pendências, não gera nada", () => {
    const agenda = gerarAgenda({
      rotina: rotina(),
      materias: [materia("a", [{ status: "REVISADO" }])],
      hoje: SEGUNDA,
    });
    expect(agenda).toEqual({
      dias: [],
      blocosPendentes: 0,
      termino: null,
      blocosSemTempo: 0,
    });
  });
});

describe("formatação", () => {
  it("formata horas e durações", () => {
    expect(formatarHora(840)).toBe("14:00");
    expect(formatarHora(65)).toBe("01:05");
    expect(formatarDuracao(45)).toBe("45 min");
    expect(formatarDuracao(60)).toBe("1h");
    expect(formatarDuracao(90)).toBe("1h30");
  });
});
