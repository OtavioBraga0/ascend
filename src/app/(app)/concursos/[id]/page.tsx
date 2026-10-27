import { CalendarDays, FileText, Settings } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import {
  PageHeader,
  PageHeaderSkeleton,
} from "@/components/layout/page-header";
import { descreverPrazo, diasAte, formatarData } from "@/lib/datas";
import { requireConcurso } from "@/server/concurso-atual";

export const metadata: Metadata = { title: "Painel · Ascend" };

export default function PainelPage({ params }: PageProps<"/concursos/[id]">) {
  return (
    <Suspense fallback={<PageHeaderSkeleton />}>
      <Painel params={params} />
    </Suspense>
  );
}

// Provisório: os gráficos entram na etapa 7 e a importação do edital na etapa 5.
async function Painel({
  params,
}: Pick<PageProps<"/concursos/[id]">, "params">) {
  const { id } = await params;
  const concurso = await requireConcurso(id);

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
        <section className="flex items-center gap-3 rounded-xl border p-4">
          <CalendarDays className="size-5 text-muted-foreground" aria-hidden />
          {concurso.dataProva ? (
            <p>
              Prova em {formatarData(concurso.dataProva)} ·{" "}
              <strong>{descreverPrazo(diasAte(concurso.dataProva))}</strong>
            </p>
          ) : (
            <p className="text-muted-foreground">
              Sem data da prova.{" "}
              <Link
                href={`/concursos/${id}/configuracoes`}
                className="text-foreground underline"
              >
                Cadastrar data
              </Link>
            </p>
          )}
        </section>
        <section className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center">
          <FileText className="size-8 text-muted-foreground" aria-hidden />
          <h2 className="font-medium">Importe o conteúdo programático</h2>
          <p className="text-sm text-muted-foreground">
            Em breve você poderá colar o edital aqui para gerar matérias e
            tópicos.
          </p>
        </section>
      </main>
    </>
  );
}
