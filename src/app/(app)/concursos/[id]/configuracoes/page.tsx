import type { Metadata } from "next";
import { Suspense } from "react";

import { ConcursoForm } from "@/components/concursos/concurso-form";
import { ExcluirConcurso } from "@/components/concursos/excluir-concurso";
import {
  PageHeader,
  PageHeaderSkeleton,
} from "@/components/layout/page-header";
import { dataParaIso } from "@/lib/datas";
import { editarConcurso } from "@/server/actions/concursos";
import { requireConcurso } from "@/server/concurso-atual";

export const metadata: Metadata = { title: "Ajustes do concurso · Ascend" };

export default function ConfiguracoesPage({
  params,
}: PageProps<"/concursos/[id]/configuracoes">) {
  return (
    <Suspense fallback={<PageHeaderSkeleton />}>
      <Configuracoes params={params} />
    </Suspense>
  );
}

// Peso, prioridade e reimportação do edital entram na etapa 8.
async function Configuracoes({
  params,
}: Pick<PageProps<"/concursos/[id]/configuracoes">, "params">) {
  const { id } = await params;
  const concurso = await requireConcurso(id);

  return (
    <>
      <PageHeader title="Ajustes do concurso" voltar={`/concursos/${id}`} />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-10 px-4 py-6">
        <section aria-labelledby="dados" className="space-y-4">
          <h2 id="dados" className="font-medium">
            Dados do concurso
          </h2>
          <ConcursoForm
            action={editarConcurso.bind(null, concurso.id)}
            initialValues={{
              nome: concurso.nome,
              banca: concurso.banca ?? "",
              cargo: concurso.cargo ?? "",
              dataProva: concurso.dataProva
                ? dataParaIso(concurso.dataProva)
                : "",
              cor: concurso.cor,
            }}
            submitLabel="Salvar alterações"
            pendingLabel="Salvando…"
          />
        </section>

        <section
          aria-labelledby="perigo"
          className="space-y-3 rounded-xl border border-destructive/30 p-4"
        >
          <h2 id="perigo" className="font-medium">
            Excluir concurso
          </h2>
          <p className="text-sm text-muted-foreground">
            Apaga o concurso e todo o progresso registrado nele.
          </p>
          <ExcluirConcurso id={concurso.id} nome={concurso.nome} />
        </section>
      </main>
    </>
  );
}
