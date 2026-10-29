import { Suspense } from "react";

import { AppNav } from "@/components/layout/app-nav";
import { requireUser } from "@/server/auth";
import { listConcursoIds } from "@/server/data/concursos";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Pular para o conteúdo
      </a>
      <Suspense fallback={<AppNav />}>
        <NavDoUsuario />
      </Suspense>
      {/* Espaço para a barra inferior (celular) ou lateral (desktop). */}
      <div
        id="conteudo"
        tabIndex={-1}
        className="flex flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] outline-none md:pb-0 md:pl-60"
      >
        {children}
      </div>
    </>
  );
}

async function NavDoUsuario() {
  const user = await requireUser();
  return <AppNav concursoIds={await listConcursoIds(user.id)} />;
}
