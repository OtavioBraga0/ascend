import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Entrar · Ascend" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold">Entrar</h1>
        <p className="text-sm text-muted-foreground">
          Enviaremos um código de 6 dígitos para o seu email.
        </p>
      </div>
      <Suspense fallback={<LoginForm />}>
        <LoginFormWithError searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

// Erros genéricos do Auth.js chegam como ?error=...
async function LoginFormWithError({
  searchParams,
}: Pick<PageProps<"/login">, "searchParams">) {
  const { error } = await searchParams;
  return (
    <LoginForm
      initialError={
        error ? "Não foi possível entrar. Tente novamente." : undefined
      }
    />
  );
}
