import type { Metadata } from "next";

import { ConcursoForm } from "@/components/concursos/concurso-form";
import { Passos } from "@/components/concursos/passos";
import { PageHeader } from "@/components/layout/page-header";
import { criarConcurso } from "@/server/actions/concursos";

export const metadata: Metadata = { title: "Novo concurso · Ascend" };

// Passo 1 de 3; os passos 2 e 3 ficam em /concursos/[id]/importar.
export default function NovoConcursoPage() {
  return (
    <>
      <PageHeader title="Novo concurso" voltar="/concursos" />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-6">
        <Passos atual={1} />
        <ConcursoForm
          action={criarConcurso}
          submitLabel="Criar concurso"
          pendingLabel="Criando…"
        />
      </main>
    </>
  );
}
