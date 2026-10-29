import { LogOut } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { RotinaForm } from "@/components/agenda/rotina-form";
import { NameForm } from "@/components/conta/name-form";
import { PageHeader } from "@/components/layout/page-header";
import { ThemeSelect } from "@/components/layout/theme-select";
import { Button } from "@/components/ui/button";
import { logout } from "@/server/actions/auth";
import { requireUser } from "@/server/auth";
import { getRotina } from "@/server/data/rotina";

export const metadata: Metadata = { title: "Conta · Ascend" };

export default function ContaPage() {
  return (
    <>
      <PageHeader title="Conta" />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-6">
        <Suspense
          fallback={<div className="h-32 animate-pulse rounded-lg bg-muted" />}
        >
          <Profile />
        </Suspense>

        <Suspense
          fallback={<div className="h-72 animate-pulse rounded-lg bg-muted" />}
        >
          <Rotina />
        </Suspense>

        <section aria-labelledby="tema" className="space-y-3">
          <h2 id="tema" className="text-sm font-medium">
            Tema
          </h2>
          <ThemeSelect />
        </section>

        <form action={logout}>
          <Button
            type="submit"
            variant="outline"
            size="lg"
            className="h-11 w-full"
          >
            <LogOut aria-hidden />
            Sair
          </Button>
        </form>
      </main>
    </>
  );
}

async function Profile() {
  const user = await requireUser();
  return (
    <section aria-label="Perfil" className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm font-medium">Email</p>
        <p className="text-muted-foreground">{user.email}</p>
      </div>
      <NameForm name={user.name} />
    </section>
  );
}

async function Rotina() {
  const user = await requireUser();
  const rotina = await getRotina(user.id);
  return (
    <section aria-labelledby="rotina" className="scroll-mt-20 space-y-4">
      <div className="space-y-1">
        <h2 id="rotina" className="text-sm font-medium">
          Rotina de estudos
        </h2>
        <p className="text-sm text-muted-foreground">
          Usada para montar a agenda de todos os seus concursos.
        </p>
      </div>
      <RotinaForm inicial={rotina} />
    </section>
  );
}
