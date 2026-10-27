"use client";

import { REGEXP_ONLY_DIGITS } from "input-otp";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { OTP_LENGTH, RESEND_COOLDOWN_SECONDS } from "@/lib/otp";
import {
  resendCode,
  verifyCode,
  type AuthFormState,
} from "@/server/actions/auth";

export function CodeForm({
  email,
  initialError,
}: {
  email: string;
  initialError?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [code, setCode] = useState("");
  const [verifyState, verifyAction, verifying] = useActionState<
    AuthFormState,
    FormData
  >(verifyCode, { error: initialError });
  const [resendState, resendAction, resending] = useActionState<
    AuthFormState,
    FormData
  >(resendCode, {});
  const cooldown = useCooldown(resendState.sentAt);

  // O callback do Auth.js precisa de navegação completa para gravar o cookie de sessão.
  useEffect(() => {
    if (verifyState.redirectTo) window.location.assign(verifyState.redirectTo);
  }, [verifyState]);

  const busy = verifying || !!verifyState.redirectTo;
  // Um reenvio bem-sucedido esconde o erro de validação anterior a ele.
  const verifyError =
    resendState.sentAt && (verifyState.at ?? 0) < resendState.sentAt
      ? undefined
      : verifyState.error;
  const error = resendState.error ?? verifyError;

  return (
    <div className="space-y-6">
      <form ref={formRef} action={verifyAction} className="space-y-4">
        <input type="hidden" name="email" value={email} />
        <div className="flex justify-center">
          <InputOTP
            name="code"
            maxLength={OTP_LENGTH}
            pattern={REGEXP_ONLY_DIGITS}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            value={code}
            onChange={setCode}
            onComplete={() => formRef.current?.requestSubmit()}
            disabled={busy}
            aria-label="Código de 6 dígitos"
            aria-invalid={!!error}
            aria-describedby={error ? "code-error" : undefined}
          >
            <InputOTPGroup>
              {Array.from({ length: OTP_LENGTH }, (_, index) => (
                <InputOTPSlot
                  key={index}
                  index={index}
                  className="size-12 text-xl"
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
        {error && (
          <p
            id="code-error"
            role="alert"
            className="text-center text-sm text-destructive"
          >
            {error}
          </p>
        )}
        {resendState.sentAt && !resendState.error && (
          <p
            role="status"
            className="text-center text-sm text-muted-foreground"
          >
            Enviamos um novo código.
          </p>
        )}
        <Button
          type="submit"
          size="lg"
          className="h-11 w-full"
          disabled={busy || code.length !== OTP_LENGTH}
        >
          {busy ? "Verificando…" : "Entrar"}
        </Button>
      </form>

      <div className="flex items-center justify-between text-sm">
        <Link
          href="/login"
          className="text-muted-foreground underline-offset-4 hover:underline"
        >
          Trocar email
        </Link>
        <form action={resendAction}>
          <input type="hidden" name="email" value={email} />
          <Button
            type="submit"
            variant="link"
            className="px-0"
            disabled={cooldown > 0 || resending}
          >
            {cooldown > 0
              ? `Reenviar código (${cooldown}s)`
              : "Reenviar código"}
          </Button>
        </form>
      </div>
    </div>
  );
}

/** Segundos restantes até poder reenviar; reinicia a cada novo envio. */
function useCooldown(sentAt: number | undefined) {
  const [startedAt] = useState(() => Date.now());
  const since = sentAt ?? startedAt;
  const [now, setNow] = useState(since);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [since]);

  const elapsed = Math.floor((Math.max(now, since) - since) / 1000);
  return Math.max(0, RESEND_COOLDOWN_SECONDS - elapsed);
}
