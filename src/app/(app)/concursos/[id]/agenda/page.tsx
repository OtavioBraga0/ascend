import { FileText, Settings2, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { BlocosDia } from "@/components/agenda/blocos-dia";
import { RotinaForm } from "@/components/agenda/rotina-form";
import { PainelEsqueleto } from "@/components/layout/esqueletos";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { formatarDuracao, formatarHora, gerarAgenda } from "@/lib/agenda";
import { formatarData, hojeIso, isoParaData, rotuloDia } from "@/lib/datas";
import { descreverDias } from "@/lib/validacao/rotina";
import { requireUser } from "@/server/auth";
import { requireConcurso } from "@/server/concurso-atual";
import { getMateriasPainel, type MateriaPainel } from "@/server/data/painel";
import { getRotina, type Rotina } from "@/server/data/rotina";

export const metadata: Metadata = { title: "Agenda · Ascend" };

export default function AgendaPage({
  params,
}: PageProps<"/concursos/[id]/agenda">) {
  return (
    <Suspense fallback={<PainelEsqueleto />}>
      <Agenda params={params} />
    </Suspense>
  );
}

async function Agenda({
  params,
}: Pick<PageProps<"/concursos/[id]/agenda">, "params">) {
  const { id } = await params;
  const [user, concurso] = await Promise.all([
    requireUser(),
    requireConcurso(id),
  ]);
  const [materias, rotina] = await Promise.all([
    getMateriasPainel(user.id, id),
    getRotina(user.id),
  ]);

  return (
    <>
      <PageHeader title="Agenda" voltar={`/concursos/${id}`} />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-6">
        {materias.length === 0 ? (
          <section className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center">
            <FileText className="size-8 text-muted-foreground" aria-hidden />
            <h2 className="font-medium">Importe o conteúdo programático</h2>
            <p className="text-sm text-muted-foreground">
              A agenda distribui os tópicos do edital nos seus horários de
              estudo.
            </p>
            <Button
              size="lg"
              className="h-11"
              render={<Link href={`/concursos/${id}/importar`} />}
            >
              Importar edital
            </Button>
          </section>
        ) : !rotina ? (
          <section aria-labelledby="rotina" className="space-y-4">
            <div className="space-y-1">
              <h2 id="rotina" className="font-medium">
                Como é a sua rotina de estudos?
              </h2>
              <p className="text-sm text-muted-foreground">
                Com os dias e horários, montamos a agenda: uma matéria por
                bloco, com pausa entre elas. A rotina vale para todos os seus
                concursos.
              </p>
            </div>
            <RotinaForm inicial={null} submitLabel="Montar agenda" />
          </section>
        ) : (
          <Plano
            concursoId={id}
            materias={materias}
            rotina={rotina}
            dataProva={concurso.dataProva}
          />
        )}
      </main>
    </>
  );
}

function Plano({
  concursoId,
  materias,
  rotina,
  dataProva,
}: {
  concursoId: string;
  materias: MateriaPainel[];
  rotina: Rotina;
  dataProva: Date | null;
}) {
  const hoje = hojeIso();
  const agenda = gerarAgenda({ rotina, materias, hoje, dataProva });
  const provaPassou = dataProva !== null && dataProva < isoParaData(hoje);
  // Aproximação: um bloco por duração cheia (o último do dia pode ser menor).
  const horasFaltando = formatarDuracao(
    Math.ceil((agenda.blocosSemTempo * rotina.duracaoBloco) / 60) * 60,
  );

  return (
    <>
      <section
        aria-label="Rotina"
        className="flex items-start gap-3 rounded-xl border p-4"
      >
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="font-medium">
            {descreverDias(rotina.diasSemana)} · a partir das{" "}
            {formatarHora(rotina.inicioMinutos)}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatarDuracao(rotina.minutosPorDia)} por dia, em blocos de{" "}
            {formatarDuracao(rotina.duracaoBloco)}
            {rotina.pausa > 0 &&
              ` com ${formatarDuracao(rotina.pausa)} de pausa`}
          </p>
        </div>
        <Link
          href="/conta#rotina"
          aria-label="Alterar rotina"
          className="-m-2 flex size-10 shrink-0 items-center justify-center rounded-lg outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Settings2 className="size-5" aria-hidden />
        </Link>
      </section>

      {agenda.blocosPendentes === 0 ? (
        <p className="rounded-xl border p-4 text-sm">
          Todos os tópicos estão revisados. Hora de fazer simulados!
        </p>
      ) : provaPassou ? (
        <p className="rounded-xl border p-4 text-sm">
          A data da prova já passou. Atualize-a nos ajustes do concurso para
          planejar o próximo ciclo.
        </p>
      ) : (
        <>
          {agenda.blocosSemTempo > 0 ? (
            <section
              aria-label="Previsão"
              className="flex gap-3 rounded-xl border border-destructive/30 p-4"
            >
              <TriangleAlert
                className="mt-0.5 size-5 shrink-0 text-destructive"
                aria-hidden
              />
              <p className="text-sm">
                Até a prova faltam cerca de <strong>{horasFaltando}</strong>{" "}
                para cobrir o edital ({agenda.blocosSemTempo} de{" "}
                {agenda.blocosPendentes} blocos). Aumente o tempo por dia,
                inclua mais dias ou marque o que você já domina. As matérias de
                menor peso ficam para o fim.
              </p>
            </section>
          ) : (
            <p className="rounded-xl border p-4 text-sm">
              {agenda.termino ? (
                <>
                  Nesse ritmo, você cobre o edital até{" "}
                  <strong>{formatarData(isoParaData(agenda.termino))}</strong>
                  {dataProva && `, antes da prova (${formatarData(dataProva)})`}
                  .
                </>
              ) : (
                "Nesse ritmo, cobrir o edital levaria mais de 3 anos. Considere aumentar o tempo por dia."
              )}
            </p>
          )}

          {agenda.dias.map((dia) => (
            <section
              key={dia.data}
              aria-labelledby={`dia-${dia.data}`}
              className="rounded-xl border px-4 pt-3 pb-1"
            >
              <h2
                id={`dia-${dia.data}`}
                className="text-sm font-medium first-letter:uppercase"
              >
                {rotuloDia(dia.data, hoje)}
              </h2>
              <BlocosDia concursoId={concursoId} blocos={dia.blocos} />
            </section>
          ))}
        </>
      )}

      <p className="text-xs text-muted-foreground">
        A agenda se ajusta sozinha: ao marcar o status de um tópico, os blocos
        seguintes são recalculados. Matérias mais pesadas e difíceis aparecem
        mais vezes.{" "}
        <Link
          href={`/concursos/${concursoId}/afinidade`}
          className="text-foreground underline underline-offset-4"
        >
          Ajustar afinidade
        </Link>
      </p>
    </>
  );
}
