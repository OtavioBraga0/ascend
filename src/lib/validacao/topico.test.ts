import { describe, expect, it } from "vitest";

import {
  detalhesTopicoSchema,
  normalizarLink,
  validarLink,
} from "@/lib/validacao/topico";

describe("normalizarLink", () => {
  it("completa com https:// quando falta o protocolo", () => {
    expect(normalizarLink(" www.planalto.gov.br/lei ")).toBe(
      "https://www.planalto.gov.br/lei",
    );
    expect(normalizarLink("http://exemplo.com")).toBe("http://exemplo.com");
  });
});

describe("validarLink", () => {
  it.each([
    ["planalto.gov.br", "https://planalto.gov.br"],
    [
      "https://www.planalto.gov.br/ccivil_03/leis/l8429.htm",
      "https://www.planalto.gov.br/ccivil_03/leis/l8429.htm",
    ],
    ["  youtube.com/watch?v=abc ", "https://youtube.com/watch?v=abc"],
    ["http://exemplo.com", "http://exemplo.com"],
  ])("aceita %s", (link, esperado) => {
    expect(validarLink(link)).toBe(esperado);
  });

  it.each([
    "nao-e-um-link",
    "localhost",
    "http://localhost:3000",
    "javascript:alert(1)",
    "ftp://arquivos.gov.br",
    "não é link",
    "site.c",
    "192.168.0.1",
    "",
  ])("recusa %s", (link) => {
    expect(validarLink(link)).toBeNull();
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
    expect(
      detalhesTopicoSchema.safeParse({
        status: "TEORIA",
        nota: "",
        links: ["nao-e-um-link"],
      }).success,
    ).toBe(false);
  });
});
