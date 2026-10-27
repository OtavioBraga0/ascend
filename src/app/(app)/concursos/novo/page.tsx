import type { Metadata } from "next";

import { ConcursoForm } from "@/components/concursos/concurso-form";
import { PageHeader } from "@/components/layout/page-header";
import { criarConcurso } from "@/server/actions/concursos";

export const metadata: Metadata = { title: "Novo concurso · Ascend" };

// Passo 1 de 3; os passos 2 (colar o edital) e 3 (revisão) entram na etapa 5.
export default function NovoConcursoPage() {
  return (
    <>
      <PageHeader title="Novo concurso" voltar="/concursos" />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <ConcursoForm
          action={criarConcurso}
          submitLabel="Criar concurso"
          pendingLabel="Criando…"
        />
      </main>
    </>
  );
}
