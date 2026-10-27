import { describe, expect, it } from "vitest";

import { ajusteMateriaSchema, moverNaLista } from "@/lib/validacao/materia";

describe("moverNaLista", () => {
  it("sobe e desce trocando com a vizinha", () => {
    expect(moverNaLista(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
    expect(moverNaLista(["a", "b", "c"], 1, 1)).toEqual(["a", "c", "b"]);
  });

  it("não sai dos limites", () => {
    const lista = ["a", "b"];
    expect(moverNaLista(lista, 0, -1)).toBe(lista);
    expect(moverNaLista(lista, 1, 1)).toBe(lista);
  });
});

describe("ajusteMateriaSchema", () => {
  it("aceita peso 1 a 5 e prioridades conhecidas", () => {
    expect(
      ajusteMateriaSchema.safeParse({ peso: 5, prioridade: "ALTA" }).success,
    ).toBe(true);
    expect(
      ajusteMateriaSchema.safeParse({ peso: 6, prioridade: "ALTA" }).success,
    ).toBe(false);
    expect(
      ajusteMateriaSchema.safeParse({ peso: 2, prioridade: "URGENTE" }).success,
    ).toBe(false);
  });
});
