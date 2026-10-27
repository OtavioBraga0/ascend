import { describe, expect, it } from "vitest";

import {
  contarRevisados,
  emPercentual,
  progressoMateria,
} from "@/lib/progresso";

describe("progressoMateria", () => {
  it("é zero sem tópicos", () => {
    expect(progressoMateria([])).toBe(0);
  });

  it("faz a média dos valores dos status", () => {
    expect(
      progressoMateria([
        { status: "NAO_INICIADO" },
        { status: "TEORIA" },
        { status: "EXERCICIOS" },
        { status: "REVISADO" },
      ]),
    ).toBeCloseTo(0.5);
    expect(
      progressoMateria([{ status: "REVISADO" }, { status: "REVISADO" }]),
    ).toBe(1);
  });
});

describe("contarRevisados", () => {
  it("conta só os revisados", () => {
    expect(
      contarRevisados([{ status: "REVISADO" }, { status: "EXERCICIOS" }]),
    ).toBe(1);
  });
});

describe("emPercentual", () => {
  it("arredonda para inteiro", () => {
    expect(emPercentual(1 / 3)).toBe(33);
    expect(emPercentual(2 / 3)).toBe(67);
  });
});
