import { describe, expect, it } from "vitest";

import { descreverDias, rotinaSchema } from "@/lib/validacao/rotina";

const valido = {
  diasSemana: ["1", "3", "5"],
  inicioMinutos: "19:30",
  minutosPorDia: "120",
  duracaoBloco: "60",
  pausa: "15",
};

describe("rotinaSchema", () => {
  it("converte os valores do formulário", () => {
    expect(rotinaSchema.parse(valido)).toEqual({
      diasSemana: [1, 3, 5],
      inicioMinutos: 19 * 60 + 30,
      minutosPorDia: 120,
      duracaoBloco: 60,
      pausa: 15,
    });
  });

  it("exige pelo menos um dia", () => {
    expect(rotinaSchema.safeParse({ ...valido, diasSemana: [] }).success).toBe(
      false,
    );
  });

  it("rejeita valores fora das opções", () => {
    expect(
      rotinaSchema.safeParse({ ...valido, duracaoBloco: "37" }).success,
    ).toBe(false);
    expect(rotinaSchema.safeParse({ ...valido, pausa: "-5" }).success).toBe(
      false,
    );
    expect(
      rotinaSchema.safeParse({ ...valido, inicioMinutos: "25:00" }).success,
    ).toBe(false);
  });

  it("rejeita rotina que passa da meia-noite", () => {
    const resultado = rotinaSchema.safeParse({
      ...valido,
      inicioMinutos: "22:00",
      minutosPorDia: "180",
    });
    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0].path).toEqual(["inicioMinutos"]);
  });
});

describe("descreverDias", () => {
  it.each([
    [[1, 2, 3, 4, 5], "Seg a Sex"],
    [[0, 1, 2, 3, 4, 5, 6], "Todos os dias"],
    [[1, 3, 6], "Seg, Qua, Sáb"],
    [[6, 0], "Sáb, Dom"],
    [[5, 6, 0], "Sex a Dom"],
  ])("%j → %s", (dias, esperado) => {
    expect(descreverDias(dias)).toBe(esperado);
  });
});
