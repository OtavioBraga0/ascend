import { describe, expect, it } from "vitest";

import { detalhesTopicoSchema, normalizarLink } from "@/lib/validacao/topico";

describe("normalizarLink", () => {
  it("completa com https:// quando falta o protocolo", () => {
    expect(normalizarLink(" www.planalto.gov.br/lei ")).toBe(
      "https://www.planalto.gov.br/lei",
    );
    expect(normalizarLink("http://exemplo.com")).toBe("http://exemplo.com");
  });
});

describe("detalhesTopicoSchema", () => {
  it("normaliza nota vazia e links", () => {
    expect(
      detalhesTopicoSchema.parse({
        status: "TEORIA",
        nota: "  ",
        links: ["youtube.com/aula"],
      }),
    ).toEqual({
      status: "TEORIA",
      nota: null,
      links: ["https://youtube.com/aula"],
    });
  });

  it("rejeita status desconhecido e links que não são http(s)", () => {
    expect(
      detalhesTopicoSchema.safeParse({ status: "FEITO", nota: "", links: [] })
        .success,
    ).toBe(false);
    expect(
      detalhesTopicoSchema.safeParse({
        status: "TEORIA",
        nota: "",
        links: ["javascript:alert(1)"],
      }).success,
    ).toBe(false);
    expect(
      detalhesTopicoSchema.safeParse({
        status: "TEORIA",
        nota: "",
        links: ["não é link"],
      }).success,
    ).toBe(false);
  });
});
