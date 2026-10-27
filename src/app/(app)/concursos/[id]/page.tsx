import { ArrowRight, CalendarDays, FileText, Settings } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PainelEsqueleto } from "@/components/layout/esqueletos";
import { PageHeader } from "@/components/layout/page-header";
import { AnelProgresso } from "@/components/painel/anel-progresso";
import {
  BarrasMaterias,
  type LinhaMateria,
} from "@/components/painel/barras-materias";
import { Button } from "@/components/ui/button";
import { corDoConcurso } from "@/lib/cores";
import { descreverPrazo, formatarData } from "@/lib/datas";
import {
  contarPorStatus,
  contarRevisados,
  diasAteProva,
  emPercentual,
  formatarRitmo,
  ordenarParaPainel,
  progressoConcurso,
  progressoMateria,
  proximoTopico,
  ritmoNecessario,
} from "@/lib/progresso";
import { STATUS_INFO } from "@/lib/status";
import { requireUser } from "@/server/auth";
import { requireConcurso } from "@/server/concurso-atual";
import { getMateriasPainel } from "@/server/data/painel";

export const metadata: Metadata = { title: "Painel · Ascend" };

export default function PainelPage({ params }: PageProps<"/concursos/[id]">) {
  return (
    <Suspense fallback={<PainelEsqueleto />}>
      <Painel params={params} />
    </Suspense>
  );
}

async function Painel({
  params,
}: Pick<PageProps<"/concursos/[id]">, "params">) {
  const { id } = await params;
  const [user, concurso] = await Promise.all([
    requireUser(),
    requireConcurso(id),
  ]);
  const materias = await getMateriasPainel(user.id, id);

  const topicos = materias.flatMap((m) => m.topicos);
  const revisados = contarRevisados(topicos);
  const progresso = progressoConcurso(materias);
  const dias = diasAteProva(concurso.dataProva);
  const ritmo = ritmoNecessario(topicos.length - revisados, dias);
  const proximo = proximoTopico(materias);
  const linhas: LinhaMateria[] = ordenarParaPainel(materias).map((m) => ({
    id: m.id,
    nome: m.nome,
    total: m.topicos.length,
    percentual: emPercentual(progressoMateria(m.topicos)),
    ...contarPorStatus(m.topicos),
  }));

  return (
    <>
      <PageHeader
        title={concurso.nome}
        voltar="/concursos"
        action={
          <Link
            href={`/concursos/${id}/configuracoes`}
            aria-label="Ajustes do concurso"
            className="-mr-2 flex size-10 shrink-0 items-center justify-center rounded-lg outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Settings className="size-5" aria-hidden />
          </Link>
        }
      />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-6">
        {materias.length === 0 ? (
          <section className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center">
            <FileText className="size-8 text-muted-foreground" aria-hidden />
            <h2 className="font-medium">Importe o conteúdo programático</h2>
            <p className="text-sm text-muted-foreground">
              Cole o texto do edital para gerar as matérias e os tópicos.
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
          <>
            {proximo ? (
              <Link
                href={`/concursos/${id}/edital?materia=${proximo.materia.id}`}
                className="flex items-center gap-3 rounded-xl bg-primary p-4 text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium opacity-80">
                    Continuar estudando
                  </p>
                  <p className="mt-0.5 font-medium">{proximo.topico.titulo}</p>
                  <p className="mt-0.5 text-sm opacity-80">
                    {proximo.materia.nome} ·{" "}
                    {STATUS_INFO[proximo.topico.status].label}
                  </p>
                </div>
                <ArrowRight className="size-5 shrink-0" aria-hidden />
              </Link>
            ) : (
              <p className="rounded-xl border p-4 text-sm">
                Todos os tópicos estão revisados. Hora de fazer simulados!
              </p>
            )}

            <section
              aria-labelledby="geral"
              className="flex items-center gap-5 rounded-xl border p-4"
            >
              <AnelProgresso
                valor={progresso}
                tamanho={112}
                espessura={10}
                traco={corDoConcurso(concurso.cor).traco}
                rotulo={`Progresso geral: ${emPercentual(progresso)}%`}
              >
                <span className="text-2xl font-semibold">
                  {emPercentual(progresso)}%
                </span>
              </AnelProgresso>
              <div className="space-y-1">
                <h2 id="geral" className="font-medium">
                  Progresso geral
                </h2>
                <p className="text-sm text-muted-foreground">
                  {revisados} de {topicos.length}{" "}
                  {topicos.length === 1
                    ? "tópico revisado"
                    : "tópicos revisados"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Média das matérias ponderada pelo peso
                </p>
              </div>
            </section>

            {concurso.dataProva && dias !== null ? (
              <section
                aria-label="Contagem regressiva"
                className="grid grid-cols-2 gap-3"
              >
                <div className="rounded-xl border p-4">
                  <p className="text-sm text-muted-foreground">
                    Dias até a prova
                  </p>
                  <p className="mt-1 text-3xl font-semibold">
                    {Math.max(dias, 0)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {dias < 0
                      ? descreverPrazo(dias)
                      : formatarData(concurso.dataProva)}
                  </p>
                </div>
                <div className="rounded-xl border p-4">
                  <p className="text-sm text-muted-foreground">
                    Ritmo necessário
                  </p>
                  {ritmo === null ? (
                    <p className="mt-1 text-sm">Prova realizada</p>
                  ) : (
                    <>
                      <p
                        className="mt-1 text-3xl font-semibold"
                        aria-label={formatarRitmo(ritmo)}
                      >
                        {ritmo.toLocaleString("pt-BR", {
                          maximumFractionDigits: 1,
                        })}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {ritmo === 1 ? "tópico" : "tópicos"} por dia para
                        revisar tudo
                      </p>
                    </>
                  )}
                </div>
              </section>
            ) : (
              <Link
                href={`/concursos/${id}/configuracoes`}
                className="flex items-center gap-3 rounded-xl border border-dashed p-4 outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <CalendarDays
                  className="size-5 text-muted-foreground"
                  aria-hidden
                />
                <span className="flex-1 text-sm">
                  Cadastre a data da prova para ver a contagem regressiva e o
                  ritmo necessário.
                </span>
                <ArrowRight
                  className="size-4 text-muted-foreground"
                  aria-hidden
                />
              </Link>
            )}

            <section
              aria-labelledby="por-materia"
              className="space-y-3 rounded-xl border p-4"
            >
              <div>
                <h2 id="por-materia" className="font-medium">
                  Por matéria
                </h2>
                <p className="text-xs text-muted-foreground">
                  Prioridade primeiro, depois as mais atrasadas. Toque numa
                  barra para abrir no edital.
                </p>
              </div>
              <BarrasMaterias concursoId={id} linhas={linhas} />
            </section>
          </>
        )}
      </main>
    </>
  );
}
