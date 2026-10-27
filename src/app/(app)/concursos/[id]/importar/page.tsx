import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ImportarEdital } from "@/components/edital/importar-edital";
import {
  PageHeader,
  PageHeaderSkeleton,
} from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/server/auth";
import { requireConcurso } from "@/server/concurso-atual";
import { getResumoEdital } from "@/server/data/edital";

export const metadata: Metadata = { title: "Importar edital · Ascend" };

export default function ImportarPage({
  params,
}: PageProps<"/concursos/[id]/importar">) {
  return (
    <Suspense fallback={<PageHeaderSkeleton />}>
      <Importar params={params} />
    </Suspense>
  );
}

async function Importar({
  params,
}: Pick<PageProps<"/concursos/[id]/importar">, "params">) {
  const { id } = await params;
  const [user, concurso] = await Promise.all([
    requireUser(),
    requireConcurso(id),
  ]);
  const resumo = await getResumoEdital(user.id, id);

  return (
    <>
      <PageHeader title={concurso.nome} voltar={`/concursos/${id}`} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        {resumo.materias > 0 ? (
          <div className="space-y-4 rounded-xl border p-4">
            <p>Este concurso já tem um edital salvo.</p>
            <Button
              variant="outline"
              render={<Link href={`/concursos/${id}/edital`} />}
            >
              Ver edital
            </Button>
          </div>
        ) : (
          <ImportarEdital concursoId={id} />
        )}
      </main>
    </>
  );
}
