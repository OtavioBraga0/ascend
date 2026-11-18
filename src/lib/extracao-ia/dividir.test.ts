import { describe, expect, it } from "vitest";

import { dividirTexto } from "./dividir";

const juntar = (partes: { texto: string }[]) =>
  partes.map((p) => p.texto).join("");

describe("dividirTexto", () => {
  it("texto pequeno vira uma parte só, sem contexto", () => {
    expect(dividirTexto("LÍNGUA PORTUGUESA\n1. Crase.", 100)).toEqual([
      { texto: "LÍNGUA PORTUGUESA\n1. Crase.", anterior: "" },
    ]);
  });

  it("as partes refazem o texto e nenhuma passa do tamanho", () => {
    const linhas = Array.from(
      { length: 200 },
      (_, i) => `${i + 1}. Tópico número ${i + 1} do conteúdo.`,
    );
    const texto = linhas.join("\n");
    const partes = dividirTexto(texto, 500, 100);
    expect(partes.length).toBeGreaterThan(1);
    expect(juntar(partes)).toBe(texto);
    for (const parte of partes)
      expect(parte.texto.length).toBeLessThanOrEqual(500);
    // Corta em quebra de linha: toda parte depois da primeira começa num tópico.
    for (const parte of partes.slice(1)) expect(parte.texto).toMatch(/^\d+\. /);
  });

  it("prefere cortar antes do nome de uma matéria", () => {
    const topicos = (n: number) =>
      Array.from({ length: n }, (_, i) => `${i + 1}. Tópico ${i + 1}.`).join(
        "\n",
      );
    const texto = `DIREITO PENAL\n${topicos(20)}\nDIREITO CIVIL\n${topicos(10)}`;
    const corte = texto.indexOf("DIREITO CIVIL");
    const [primeira, segunda] = dividirTexto(texto, corte + 60, 50);
    expect(primeira.texto).toBe(texto.slice(0, corte));
    expect(segunda.texto.startsWith("DIREITO CIVIL\n")).toBe(true);
  });

  it("leva o final da parte anterior como contexto", () => {
    const texto = Array.from({ length: 50 }, (_, i) => `Linha ${i}`).join("\n");
    const partes = dividirTexto(texto, 100, 30);
    expect(partes[0].anterior).toBe("");
    const fimDaPrimeira = partes[0].texto.slice(-30);
    expect(partes[1].anterior).toBe(fimDaPrimeira);
  });

  it("sem quebras de linha, corta depois de ';' ou '.'", () => {
    const texto = Array.from(
      { length: 60 },
      (_, i) => `item de conteúdo ${i}`,
    ).join("; ");
    const partes = dividirTexto(texto, 200, 0);
    expect(juntar(partes)).toBe(texto);
    for (const parte of partes.slice(0, -1)) expect(parte.texto).toMatch(/; $/);
  });

  it("sem pontuação, corta num espaço; sem espaço, no limite", () => {
    const palavras = Array.from({ length: 100 }, () => "palavra").join(" ");
    for (const parte of dividirTexto(palavras, 50, 0).slice(0, -1))
      expect(parte.texto).toMatch(/ $/);
    const corrido = "a".repeat(120);
    expect(dividirTexto(corrido, 50, 0).map((p) => p.texto.length)).toEqual([
      50, 50, 20,
    ]);
  });
});
