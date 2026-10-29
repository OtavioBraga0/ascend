import { describe, expect, it } from "vitest";

import type { Prioridade, StatusTopico } from "@/generated/prisma/enums";
import { isoParaData } from "@/lib/datas";
import {
  contarPorStatus,
  contarRevisados,
  diasAteProva,
  emPercentual,
  diasPorTopico,
  formatarRitmo,
  ordenarParaPainel,
  progressoConcurso,
  progressoMateria,
  proximoTopico,
  ritmoNecessario,
} from "@/lib/progresso";

const t = (status: StatusTopico, ordem = 0) => ({ status, ordem });

function materia(
  nome: string,
  statuses: StatusTopico[],
  extra: { peso?: number; prioridade?: Prioridade; ordem?: number } = {},
) {
  return {
    nome,
    peso: extra.peso ?? 1,
    prioridade: extra.prioridade ?? ("MEDIA" as Prioridade),
    ordem: extra.ordem ?? 0,
    topicos: statuses.map((status, ordem) => t(status, ordem)),
  };
}

describe("progressoMateria", () => {
  it("é zero sem tópicos", () => {
    expect(progressoMateria([])).toBe(0);
  });

  it("faz a média dos valores dos status (0, 1/3, 2/3, 1)", () => {
    expect(
      progressoMateria([
        t("NAO_INICIADO"),
        t("TEORIA"),
        t("EXERCICIOS"),
        t("REVISADO"),
      ]),
    ).toBeCloseTo(0.5);
    expect(progressoMateria([t("TEORIA")])).toBeCloseTo(1 / 3);
    expect(progressoMateria([t("REVISADO"), t("REVISADO")])).toBe(1);
  });
});

describe("progressoConcurso", () => {
  it("pondera as matérias pelo peso", () => {
    const materias = [
      materia("A", ["REVISADO"], { peso: 3 }), // 1
      materia("B", ["NAO_INICIADO"], { peso: 1 }), // 0
    ];
    expect(progressoConcurso(materias)).toBeCloseTo(0.75);
  });

  it("conta matéria sem tópicos como 0", () => {
    expect(
      progressoConcurso([materia("A", ["REVISADO"]), materia("B", [])]),
    ).toBeCloseTo(0.5);
  });

  it("é zero sem matérias", () => {
    expect(progressoConcurso([])).toBe(0);
  });
});

describe("contagens", () => {
  it("concluídos são os revisados", () => {
    expect(
      contarRevisados([t("REVISADO"), t("EXERCICIOS"), t("REVISADO")]),
    ).toBe(2);
  });

  it("conta por status", () => {
    expect(contarPorStatus([t("TEORIA"), t("TEORIA"), t("REVISADO")])).toEqual({
      NAO_INICIADO: 0,
      TEORIA: 2,
      EXERCICIOS: 0,
      REVISADO: 1,
    });
  });
});

describe("prazo e ritmo", () => {
  it("dias até a prova no fuso de São Paulo", () => {
    const prova = isoParaData("2026-11-10");
    expect(diasAteProva(prova, new Date("2026-10-28T02:00:00Z"))).toBe(14);
    expect(diasAteProva(null)).toBeNull();
  });

  it("ritmo = não revisados ÷ dias", () => {
    expect(ritmoNecessario(30, 10)).toBe(3);
    expect(ritmoNecessario(5, 0)).toBe(5);
    expect(ritmoNecessario(5, -1)).toBeNull();
    expect(ritmoNecessario(5, null)).toBeNull();
  });

  it("formata o ritmo em pt-BR", () => {
    expect(formatarRitmo(2.25)).toBe("2,3 tópicos/dia");
    expect(formatarRitmo(1)).toBe("1 tópico/dia");
    expect(formatarRitmo(0)).toBe("0 tópicos/dia");
  });

  it("abaixo de 1 tópico/dia, mostra de quantos em quantos dias", () => {
    expect(formatarRitmo(0.2)).toBe("1 tópico a cada 5 dias");
    expect(diasPorTopico(0.3)).toBe("3");
    expect(diasPorTopico(0.8)).toBe("1,3");
    expect(diasPorTopico(0.5)).toBe("2");
  });

  it("percentual inteiro", () => {
    expect(emPercentual(1 / 3)).toBe(33);
    expect(emPercentual(2 / 3)).toBe(67);
  });
});

describe("ordenarParaPainel", () => {
  it("prioridade primeiro, depois menor progresso", () => {
    const materias = [
      materia("Média adiantada", ["REVISADO"], { ordem: 0 }),
      materia("Baixa", ["NAO_INICIADO"], { prioridade: "BAIXA", ordem: 1 }),
      materia("Média atrasada", ["NAO_INICIADO"], { ordem: 2 }),
      materia("Alta", ["REVISADO"], { prioridade: "ALTA", ordem: 3 }),
    ];
    expect(ordenarParaPainel(materias).map((m) => m.nome)).toEqual([
      "Alta",
      "Média atrasada",
      "Média adiantada",
      "Baixa",
    ]);
  });
});

describe("proximoTopico", () => {
  it("primeiro não revisado da matéria de maior prioridade", () => {
    const materias = [
      materia("Média", ["NAO_INICIADO"], { ordem: 0 }),
      materia("Alta", ["REVISADO", "EXERCICIOS", "NAO_INICIADO"], {
        prioridade: "ALTA",
        ordem: 1,
      }),
    ];
    const proximo = proximoTopico(materias);
    expect(proximo?.materia.nome).toBe("Alta");
    expect(proximo?.topico.ordem).toBe(1);
  });

  it("pula matérias já revisadas e desempata por peso", () => {
    const materias = [
      materia("Leve", ["NAO_INICIADO"], { peso: 1, ordem: 0 }),
      materia("Pesada", ["NAO_INICIADO"], { peso: 4, ordem: 1 }),
      materia("Pronta", ["REVISADO"], { prioridade: "ALTA", ordem: 2 }),
    ];
    expect(proximoTopico(materias)?.materia.nome).toBe("Pesada");
  });

  it("é null quando tudo foi revisado", () => {
    expect(proximoTopico([materia("A", ["REVISADO"])])).toBeNull();
  });
});
