import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { CodeForm } from "@/components/auth/code-form";

export const metadata: Metadata = { title: "Código de acesso · Ascend" };

const ERRORS: Record<string, string> = {
  codigo: "Código inválido ou expirado.",
  limite: "Muitas tentativas. Aguarde alguns minutos e peça um novo código.",
};

export default function CodePage({ searchParams }: PageProps<"/login/codigo">) {
  return (
    <Suspense>
      <CodeStep searchParams={searchParams} />
    </Suspense>
  );
}

async function CodeStep({
  searchParams,
}: Pick<PageProps<"/login/codigo">, "searchParams">) {
  const { email, erro } = await searchParams;
  if (typeof email !== "string" || !email) redirect("/login");

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold">Digite o código</h1>
        <p className="text-sm text-muted-foreground">
          Enviamos um código de 6 dígitos para{" "}
          <strong className="text-foreground">{email}</strong>. Ele expira em 10
          minutos.
        </p>
      </div>
      <CodeForm
        email={email}
        initialError={typeof erro === "string" ? ERRORS[erro] : undefined}
      />
    </div>
  );
}
