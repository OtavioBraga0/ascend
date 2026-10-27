import type { Metadata } from "next";
import { Suspense } from "react";

import { ImportarEdital } from "@/components/edital/importar-edital";
import {
  PageHeader,
  PageHeaderSkeleton,
} from "@/components/layout/page-header";
import { requireUser } from "@/server/auth";
import { requireConcurso } from "@/server/concurso-atual";
import { getEstruturaEdital } from "@/server/data/edital";

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
  const existentes = (await getEstruturaEdital(user.id, id)).map((m) => ({
    id: m.id,
    nome: m.nome,
    peso: m.peso,
  }));
  const reimportacao = existentes.length > 0;

  return (
    <>
      <PageHeader
        title={reimportacao ? "Reimportar edital" : concurso.nome}
        voltar={
          reimportacao ? `/concursos/${id}/configuracoes` : `/concursos/${id}`
        }
      />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <ImportarEdital concursoId={id} existentes={existentes} />
      </main>
    </>
  );
}
