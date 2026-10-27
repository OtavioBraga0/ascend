import { randomInt } from "node:crypto";

import { OTP_LENGTH } from "@/lib/otp";

/** Código numérico aleatório de 6 dígitos, com zeros à esquerda. */
export function generateOtpCode(): string {
  return randomInt(0, 10 ** OTP_LENGTH)
    .toString()
    .padStart(OTP_LENGTH, "0");
}
