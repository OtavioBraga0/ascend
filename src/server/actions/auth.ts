"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { OTP_PROVIDER_ID, signIn, signOut } from "@/auth";
import { isValidOtpCode, normalizeEmail } from "@/lib/otp";
import {
  deleteVerificationTokens,
  isRateLimited,
} from "@/server/data/auth-attempts";

export type AuthFormState = {
  error?: string;
  /** Momento do erro, para a tela saber qual mensagem é a mais recente. */
  at?: number;
  redirectTo?: string;
  sentAt?: number;
};

const AFTER_LOGIN_PATH = "/concursos";

const emailSchema = z
  .string("Informe um email válido.")
  .transform(normalizeEmail)
  .pipe(z.email("Informe um email válido."));

const MESSAGES = {
  sendLimit:
    "Você pediu muitos códigos. Aguarde alguns minutos e tente de novo.",
  verifyLimit:
    "Muitas tentativas. Aguarde alguns minutos e peça um novo código.",
  sendFailed: "Não foi possível enviar o código. Tente novamente.",
  invalidCode: "Código inválido ou expirado.",
};

async function sendCode(email: string): Promise<AuthFormState> {
  if (await isRateLimited(email, "send")) return { error: MESSAGES.sendLimit };

  await deleteVerificationTokens(email);
  const url = await signIn(OTP_PROVIDER_ID, {
    email,
    redirect: false,
    redirectTo: AFTER_LOGIN_PATH,
  });

  const error = new URL(url, "http://localhost").searchParams.get("error");
  if (error === "AccessDenied") return { error: MESSAGES.sendLimit };
  if (error) return { error: MESSAGES.sendFailed };
  return { sentAt: Date.now() };
}

export async function requestCode(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const result = await sendCode(parsed.data);
  if (result.error) return result;
  redirect(`/login/codigo?${new URLSearchParams({ email: parsed.data })}`);
}

export async function resendCode(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  return sendCode(parsed.data);
}

const verifySchema = z.object({
  email: emailSchema,
  code: z.string().refine(isValidOtpCode, MESSAGES.invalidCode),
});

/**
 * Checa o limite de tentativas e devolve a URL do callback do Auth.js, que
 * valida e consome o código. O cliente navega para ela (navegação completa,
 * para o cookie de sessão ser gravado). O registro da tentativa acontece no
 * route handler do callback.
 */
export async function verifyCode(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = verifySchema.safeParse({
    email: formData.get("email"),
    code: formData.get("code"),
  });
  if (!parsed.success) return { error: MESSAGES.invalidCode, at: Date.now() };

  const { email, code } = parsed.data;
  if (await isRateLimited(email, "verify"))
    return { error: MESSAGES.verifyLimit, at: Date.now() };

  const params = new URLSearchParams({
    email,
    token: code,
    callbackUrl: AFTER_LOGIN_PATH,
  });
  return { redirectTo: `/api/auth/callback/${OTP_PROVIDER_ID}?${params}` };
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
