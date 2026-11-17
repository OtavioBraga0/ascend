import { describe, expect, it } from "vitest";

import {
  MAX_CARACTERES,
  MENSAGEM_TEXTO_CURTO,
  MENSAGEM_TEXTO_GRANDE,
  MIN_CARACTERES,
  prepararTexto,
} from "./texto";

describe("prepararTexto", () => {
  it("normaliza como o parser: espaços, hifenização e números de página", () => {
    const texto =
      "LÍNGUA  PORTUGUESA\r\n\r\nLeitura e interpretação de textos lite-\nrários.\n12\nOrtografia oficial.";
    expect(prepararTexto(texto)).toEqual({
      ok: true,
      texto:
        "LÍNGUA PORTUGUESA\nLeitura e interpretação de textos literários.\nOrtografia oficial.",
    });
  });

  it("recusa texto curto depois de normalizar", () => {
    const curto = `${"a".repeat(MIN_CARACTERES - 1)}\n\n\n      `;
    expect(prepararTexto(curto)).toEqual({
      ok: false,
      mensagem: MENSAGEM_TEXTO_CURTO,
    });
    expect(prepararTexto("a".repeat(MIN_CARACTERES)).ok).toBe(true);
  });

  it("recusa texto acima do limite", () => {
    expect(prepararTexto("a".repeat(MAX_CARACTERES)).ok).toBe(true);
    expect(prepararTexto("a".repeat(MAX_CARACTERES + 1))).toEqual({
      ok: false,
      mensagem: MENSAGEM_TEXTO_GRANDE,
    });
  });
});
