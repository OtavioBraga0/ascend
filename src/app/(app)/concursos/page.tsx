import { Plus, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ConcursoCard } from "@/components/concursos/concurso-card";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/server/auth";
import { listConcursos } from "@/server/data/concursos";
import { getProgressoConcursos } from "@/server/data/painel";
import { progressoConcurso } from "@/lib/progresso";

export const metadata: Metadata = { title: "Meus concursos · Ascend" };

export default function ConcursosPage() {
  return (
    <>
      <PageHeader title="Meus concursos" />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <Suspense fallback={<ListaSkeleton />}>
          <ListaConcursos />
        </Suspense>
        <Link
          href="/concursos/novo"
          className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 flex h-14 items-center gap-2 rounded-full bg-primary px-5 font-medium text-primary-foreground shadow-lg outline-none hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50 md:right-8 md:bottom-8"
        >
          <Plus className="size-5" aria-hidden />
          Novo concurso
        </Link>
      </main>
    </>
  );
}

async function ListaConcursos() {
  const user = await requireUser();
  const [concursos, progressos] = await Promise.all([
    listConcursos(user.id),
    getProgressoConcursos(user.id),
  ]);

  if (concursos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-12 text-center">
        <Trophy className="size-10 text-muted-foreground" aria-hidden />
        <div className="space-y-1">
          <h2 className="font-medium">Cadastre seu primeiro concurso</h2>
          <p className="text-sm text-muted-foreground">
            Depois é só colar o conteúdo programático do edital e acompanhar seu
            progresso.
          </p>
        </div>
        <Button
          size="lg"
          className="h-11"
          render={<Link href="/concursos/novo" />}
        >
          <Plus aria-hidden />
          Novo concurso
        </Button>
      </div>
    );
  }

  return (
    // Espaço extra no fim para o botão flutuante não cobrir o último card.
    <ul className="space-y-3 pb-20">
      {concursos.map((concurso) => (
        <li key={concurso.id}>
          <ConcursoCard
            concurso={concurso}
            progresso={
              progressos.has(concurso.id)
                ? progressoConcurso(progressos.get(concurso.id)!)
                : null
            }
          />
        </li>
      ))}
    </ul>
  );
}

function ListaSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      {[0, 1].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}
