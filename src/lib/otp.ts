export const OTP_LENGTH = 6;
export const OTP_MAX_AGE_SECONDS = 10 * 60;
export const RESEND_COOLDOWN_SECONDS = 60;

export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const RATE_LIMITS = { send: 3, verify: 5 } as const;
export type AuthAttemptKind = keyof typeof RATE_LIMITS;

export function isValidOtpCode(code: string): boolean {
  return new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code);
}

/** Mesma normalização usada pelo Auth.js e pelo rate limit. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Cookie com o momento do último envio do código, para o contador de reenvio. */
export const OTP_SENT_COOKIE = "otp_enviado";

export function encodeOtpSent(email: string, sentAt: number): string {
  return JSON.stringify({ email, sentAt });
}

/**
 * Momento do último envio para este email, se o cookie for dele e ainda
 * estiver dentro da validade do código. Valor inválido vira `undefined`.
 */
export function decodeOtpSent(
  value: string | undefined,
  email: string,
  now: number = Date.now(),
): number | undefined {
  if (!value) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null) return undefined;
    const { email: cookieEmail, sentAt } = parsed as Record<string, unknown>;
    if (cookieEmail !== normalizeEmail(email)) return undefined;
    if (typeof sentAt !== "number" || !Number.isFinite(sentAt))
      return undefined;
    if (sentAt > now || now - sentAt > OTP_MAX_AGE_SECONDS * 1000)
      return undefined;
    return sentAt;
  } catch {
    return undefined;
  }
}
