import type { Metadata } from "next";
import { Suspense } from "react";

import {
  PageHeader,
  PageHeaderSkeleton,
} from "@/components/layout/page-header";
import { requireConcurso } from "@/server/concurso-atual";

export const metadata: Metadata = { title: "Edital · Ascend" };

// Provisório: a lista de matérias e tópicos entra na etapa 6.
export default function EditalPage({
  params,
}: PageProps<"/concursos/[id]/edital">) {
  return (
    <Suspense fallback={<PageHeaderSkeleton />}>
      <Edital params={params} />
    </Suspense>
  );
}

async function Edital({
  params,
}: Pick<PageProps<"/concursos/[id]/edital">, "params">) {
  const { id } = await params;
  const concurso = await requireConcurso(id);
  return (
    <>
      <PageHeader title={concurso.nome} voltar={`/concursos/${id}`} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <p className="text-sm text-muted-foreground">
          As matérias e os tópicos do edital aparecerão aqui.
        </p>
      </main>
    </>
  );
}
