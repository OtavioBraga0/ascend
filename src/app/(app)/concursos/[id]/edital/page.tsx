import { FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EditalLista } from "@/components/edital/edital-lista";
import { EditalEsqueleto } from "@/components/layout/esqueletos";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/server/auth";
import { requireConcurso } from "@/server/concurso-atual";
import { getEdital } from "@/server/data/topicos";

export const metadata: Metadata = { title: "Edital · Ascend" };

export default function EditalPage({
  params,
}: PageProps<"/concursos/[id]/edital">) {
  return (
    <Suspense fallback={<EditalEsqueleto />}>
      <Edital params={params} />
    </Suspense>
  );
}

async function Edital({
  params,
}: Pick<PageProps<"/concursos/[id]/edital">, "params">) {
  const { id } = await params;
  const [user, concurso] = await Promise.all([
    requireUser(),
    requireConcurso(id),
  ]);
  const materias = await getEdital(user.id, id);

  return (
    <>
      <PageHeader title={concurso.nome} voltar={`/concursos/${id}`} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-4">
        {materias.length === 0 ? (
          <section className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center">
            <FileText className="size-8 text-muted-foreground" aria-hidden />
            <h2 className="font-medium">Nenhuma matéria ainda</h2>
            <p className="text-sm text-muted-foreground">
              Importe o conteúdo programático para começar a marcar seu
              progresso.
            </p>
            <Button
              size="lg"
              className="h-11"
              render={<Link href={`/concursos/${id}/importar`} />}
            >
              Importar edital
            </Button>
          </section>
        ) : (
          <EditalLista materias={materias} />
        )}
      </main>
    </>
  );
}
