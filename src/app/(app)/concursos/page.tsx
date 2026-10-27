import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { logout } from "@/server/actions/auth";
import { requireUser } from "@/server/auth";

// Provisória: a lista de concursos entra na etapa 4.
export default function ConcursosPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold">Meus concursos</h1>
      <Suspense
        fallback={<p className="text-sm text-muted-foreground">Carregando…</p>}
      >
        <SignedInAs />
      </Suspense>
    </main>
  );
}

async function SignedInAs() {
  const user = await requireUser();
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Você entrou como {user.email}.
      </p>
      <form action={logout}>
        <Button type="submit" variant="outline">
          Sair
        </Button>
      </form>
    </>
  );
}
