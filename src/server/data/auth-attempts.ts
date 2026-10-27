import "server-only";

import { prisma } from "@/lib/prisma";
import {
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMITS,
  type AuthAttemptKind,
} from "@/lib/otp";

export async function countRecentAttempts(
  email: string,
  kind: AuthAttemptKind,
) {
  return prisma.authAttempt.count({
    where: {
      email,
      kind,
      createdAt: { gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) },
    },
  });
}

export async function isRateLimited(email: string, kind: AuthAttemptKind) {
  return (await countRecentAttempts(email, kind)) >= RATE_LIMITS[kind];
}

/** Registra a tentativa se ainda houver saldo; retorna `false` se o limite já foi atingido. */
export async function consumeAttempt(email: string, kind: AuthAttemptKind) {
  if (await isRateLimited(email, kind)) return false;
  await prisma.authAttempt.create({ data: { email, kind } });
  return true;
}

/** Invalida códigos anteriores ao enviar um novo. */
export async function deleteVerificationTokens(email: string) {
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });
}
