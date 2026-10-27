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
