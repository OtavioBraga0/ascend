import { describe, expect, it } from "vitest";

import { isValidOtpCode, normalizeEmail } from "@/lib/otp";
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
