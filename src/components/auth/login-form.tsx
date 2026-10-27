"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestCode, type AuthFormState } from "@/server/actions/auth";

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    requestCode,
    {
      error: initialError,
    },
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          placeholder="voce@email.com"
          required
          autoFocus
          aria-invalid={!!state.error}
          aria-describedby={state.error ? "email-error" : undefined}
          className="h-11 text-base"
        />
        {state.error && (
          <p id="email-error" role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
      </div>
      <Button
        type="submit"
        size="lg"
        className="h-11 w-full"
        disabled={pending}
      >
        {pending ? "Enviando…" : "Receber código"}
      </Button>
    </form>
  );
}
