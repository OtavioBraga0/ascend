import { describe, expect, it } from "vitest";

import {
  DESTINO_PADRAO,
  destinoSeguro,
  parametroVoltar,
} from "@/lib/destino-login";

describe("destinoSeguro", () => {
  it("aceita caminhos internos, com query", () => {
    expect(destinoSeguro("/c/abc123")).toBe("/c/abc123");
    expect(destinoSeguro("/concursos?x=1")).toBe("/concursos?x=1");
  });

  it.each([
    [undefined],
    [""],
    ["https://malicioso.com"],
    ["//malicioso.com"],
    ["/\\malicioso.com"],
    ["/\t/malicioso.com"],
    ["javascript:alert(1)"],
    ["c/abc"],
  ])("rejeita %j", (valor) => {
    expect(destinoSeguro(valor)).toBe(DESTINO_PADRAO);
  });
});

describe("parametroVoltar", () => {
  it("omite o destino padrão", () => {
    expect(parametroVoltar(DESTINO_PADRAO)).toBe("");
    expect(parametroVoltar("/c/abc")).toBe("?voltar=%2Fc%2Fabc");
  });
});
