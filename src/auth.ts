import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import type { EmailConfig } from "next-auth/providers/email";
import { z } from "zod";

import { otpEmail } from "@/lib/email/otp-template";
import { sendMail } from "@/lib/email/mailer";
import { normalizeEmail, OTP_MAX_AGE_SECONDS } from "@/lib/otp";
import { generateOtpCode } from "@/lib/otp-code";
import { prisma } from "@/lib/prisma";
import { consumeAttempt } from "@/server/data/auth-attempts";

export const OTP_PROVIDER_ID = "otp";

/**
 * Provider de email do Auth.js adaptado para OTP: em vez do link mágico,
 * o token é um código de 6 dígitos e o email contém só o código.
 * O usuário digita o código em /login/codigo, que redireciona para
 * /api/auth/callback/otp?email=...&token=...
 */
const otpProvider: EmailConfig = {
  id: OTP_PROVIDER_ID,
  type: "email",
  name: "Código por email",
  maxAge: OTP_MAX_AGE_SECONDS,
  generateVerificationToken: generateOtpCode,
  normalizeIdentifier: (identifier) =>
    z.email().parse(normalizeEmail(identifier)),
  async sendVerificationRequest({ identifier, token }) {
    await sendMail({ to: identifier, ...otpEmail(token) });
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Na Vercel o host é confiável; fora dela, o Auth.js só confiaria com AUTH_URL definida.
  trustHost: true,
  session: { strategy: "database" },
  providers: [otpProvider],
  pages: {
    signIn: "/login",
    verifyRequest: "/login/codigo",
    error: "/login",
  },
  callbacks: {
    // Rate limit de envio aplicado aqui para valer também em chamadas diretas a /api/auth/signin.
    async signIn({ user, email }) {
      if (email?.verificationRequest && user.email) {
        return consumeAttempt(user.email, "send");
      }
      return true;
    },
  },
});
