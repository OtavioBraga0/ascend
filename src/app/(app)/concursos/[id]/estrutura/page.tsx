import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { EditarEstrutura } from "@/components/edital/editar-estrutura";
import { FormularioEsqueleto } from "@/components/layout/esqueletos";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/server/auth";
import { requireConcurso } from "@/server/concurso-atual";
import { getEstruturaEdital } from "@/server/data/edital";

export const metadata: Metadata = { title: "Editar estrutura · Ascend" };

export default function EstruturaPage({
  params,
}: PageProps<"/concursos/[id]/estrutura">) {
  return (
    <Suspense fallback={<FormularioEsqueleto />}>
      <Estrutura params={params} />
    </Suspense>
  );
}

async function Estrutura({
  params,
}: Pick<PageProps<"/concursos/[id]/estrutura">, "params">) {
  const { id } = await params;
  const [user] = await Promise.all([requireUser(), requireConcurso(id)]);
  const materias = await getEstruturaEdital(user.id, id);
  if (materias.length === 0) redirect(`/concursos/${id}/importar`);

  return (
    <>
      <PageHeader
        title="Editar estrutura"
        voltar={`/concursos/${id}/configuracoes`}
      />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <EditarEstrutura concursoId={id} materias={materias} />
      </main>
    </>
  );
}
