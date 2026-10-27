import { FileText, ListTree } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ConcursoForm } from "@/components/concursos/concurso-form";
import { ExcluirConcurso } from "@/components/concursos/excluir-concurso";
import { MateriasAjustes } from "@/components/concursos/materias-ajustes";
import {
  PageHeader,
  PageHeaderSkeleton,
} from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { dataParaIso } from "@/lib/datas";
import { editarConcurso } from "@/server/actions/concursos";
import { requireUser } from "@/server/auth";
import { requireConcurso } from "@/server/concurso-atual";
import { listMateriasAjustes } from "@/server/data/materias";

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

async function Configuracoes({
  params,
}: Pick<PageProps<"/concursos/[id]/configuracoes">, "params">) {
  const { id } = await params;
  const [user, concurso] = await Promise.all([
    requireUser(),
    requireConcurso(id),
  ]);
  const materias = await listMateriasAjustes(user.id, id);

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

        <section aria-labelledby="materias" className="space-y-3">
          <div>
            <h2 id="materias" className="font-medium">
              Matérias
            </h2>
            <p className="text-sm text-muted-foreground">
              O peso entra na média do progresso; a prioridade define a ordem no
              painel e o “Continuar estudando”. As alterações são salvas na
              hora.
            </p>
          </div>
          {materias.length > 0 ? (
            <MateriasAjustes concursoId={id} materias={materias} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma matéria ainda.
            </p>
          )}
        </section>

        <section aria-labelledby="edital" className="space-y-3">
          <h2 id="edital" className="font-medium">
            Edital
          </h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            {materias.length > 0 && (
              <Button
                variant="outline"
                size="lg"
                className="h-11 justify-start sm:flex-1"
                render={<Link href={`/concursos/${id}/estrutura`} />}
              >
                <ListTree aria-hidden />
                Editar estrutura
              </Button>
            )}
            <Button
              variant="outline"
              size="lg"
              className="h-11 justify-start sm:flex-1"
              render={<Link href={`/concursos/${id}/importar`} />}
            >
              <FileText aria-hidden />
              {materias.length > 0 ? "Reimportar edital" : "Importar edital"}
            </Button>
          </div>
          {materias.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Ao reimportar, matérias e tópicos com o mesmo nome mantêm o
              progresso.
            </p>
          )}
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
