import { describe, expect, it } from "vitest";

import {
  decodeOtpSent,
  encodeOtpSent,
  isValidOtpCode,
  normalizeEmail,
  OTP_MAX_AGE_SECONDS,
} from "@/lib/otp";
import { generateOtpCode } from "@/lib/otp-code";

describe("generateOtpCode", () => {
  it("gera sempre 6 dígitos numéricos", () => {
    for (let i = 0; i < 1000; i++) {
      expect(generateOtpCode()).toMatch(/^\d{6}$/);
    }
  });
});

describe("isValidOtpCode", () => {
  it("aceita apenas 6 dígitos", () => {
    expect(isValidOtpCode("012345")).toBe(true);
    expect(isValidOtpCode("12345")).toBe(false);
    expect(isValidOtpCode("1234567")).toBe(false);
    expect(isValidOtpCode("12a456")).toBe(false);
  });
});

describe("normalizeEmail", () => {
  it("remove espaços e converte para minúsculas", () => {
    expect(normalizeEmail("  Fulano@Email.COM ")).toBe("fulano@email.com");
  });
});

describe("decodeOtpSent", () => {
  const now = 1_800_000_000_000;
  const email = "ana@exemplo.com";

  it("devolve o momento do envio para o mesmo email", () => {
    const sentAt = now - 5_000;
    expect(decodeOtpSent(encodeOtpSent(email, sentAt), email, now)).toBe(
      sentAt,
    );
    expect(
      decodeOtpSent(encodeOtpSent(email, sentAt), " Ana@Exemplo.com ", now),
    ).toBe(sentAt);
  });

  it("ignora cookie de outro email, expirado, no futuro ou inválido", () => {
    const expirado = now - OTP_MAX_AGE_SECONDS * 1000 - 1;
    for (const value of [
      undefined,
      "",
      "lixo",
      "null",
      JSON.stringify({ email, sentAt: "ontem" }),
      encodeOtpSent("outra@exemplo.com", now - 1_000),
      encodeOtpSent(email, expirado),
      encodeOtpSent(email, now + 60_000),
    ]) {
      expect(decodeOtpSent(value, email, now)).toBeUndefined();
    }
  });
});
