import { randomBytes } from "node:crypto";

import { describe, expect, it } from "vitest";

import { tokenDoCaminho, tokenTemFormato } from "@/lib/compartilhamento";

describe("tokenDoCaminho", () => {
  it("extrai o token de /c/<token>", () => {
    expect(tokenDoCaminho("/c/abc")).toBe("abc");
    expect(tokenDoCaminho("/c/abc/")).toBe("abc");
  });

  it("ignora outros caminhos e a própria página de indisponível", () => {
    for (const caminho of [
      "/c",
      "/c/",
      "/c/abc/extra",
      "/concursos/abc",
      "/c/indisponivel",
      "/c/indisponivel/",
    ]) {
      expect(tokenDoCaminho(caminho)).toBeNull();
    }
  });
});

describe("tokenTemFormato", () => {
  it("aceita os tokens que o app gera", () => {
    for (let i = 0; i < 100; i++) {
      expect(tokenTemFormato(randomBytes(16).toString("base64url"))).toBe(true);
    }
  });

  it("recusa tamanhos e caracteres impossíveis", () => {
    for (const token of [
      "",
      "abc",
      "a".repeat(21),
      "a".repeat(23),
      `${"a".repeat(21)}=`,
      `${"a".repeat(21)}/`,
      `${"a".repeat(21)}.`,
    ]) {
      expect(tokenTemFormato(token)).toBe(false);
    }
  });
});
