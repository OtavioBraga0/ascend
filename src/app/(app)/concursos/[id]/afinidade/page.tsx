import { CalendarDays } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AfinidadeMaterias } from "@/components/agenda/afinidade-materias";
import { Passos } from "@/components/concursos/passos";
import { FormularioEsqueleto } from "@/components/layout/esqueletos";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { BLOCOS_POR_TOPICO } from "@/lib/agenda";
import { requireUser } from "@/server/auth";
import { requireConcurso } from "@/server/concurso-atual";
import { listMateriasAfinidade } from "@/server/data/materias";

export const metadata: Metadata = { title: "Afinidade · Ascend" };

export default function AfinidadePage({
  params,
  searchParams,
}: PageProps<"/concursos/[id]/afinidade">) {
  return (
    <Suspense fallback={<FormularioEsqueleto />}>
      <Afinidade params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Afinidade({
  params,
  searchParams,
}: Pick<PageProps<"/concursos/[id]/afinidade">, "params" | "searchParams">) {
  const [{ id }, { novo, copiado }] = await Promise.all([params, searchParams]);
  const [user, concurso] = await Promise.all([
    requireUser(),
    requireConcurso(id),
  ]);
  const materias = await listMateriasAfinidade(user.id, id);
  if (materias.length === 0) redirect(`/concursos/${id}/importar`);
  // `?novo=1`: passo 4 do assistente de novo concurso. `?copiado=1`: veio de
  // uma estrutura compartilhada, e este é o próximo passo.
  const assistente = novo === "1";
  const copia = copiado === "1";

  return (
    <>
      <PageHeader
        title={assistente || copia ? concurso.nome : "Afinidade"}
        voltar={
          assistente || copia
            ? `/concursos/${id}`
            : `/concursos/${id}/configuracoes`
        }
      />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-6">
        {assistente && <Passos atual={4} />}
        {copia && (
          <p role="status" className="rounded-lg bg-muted px-3 py-2 text-sm">
            Estrutura copiada para a sua conta. Agora diga como você se sai em
            cada matéria para montarmos sua agenda.
          </p>
        )}
        <div className="space-y-1">
          <h2 className="font-medium">Como você se sai em cada matéria?</h2>
          <p className="text-sm text-muted-foreground">
            A agenda reserva {BLOCOS_POR_TOPICO.FACIL} bloco por tópico do que
            você domina, {BLOCOS_POR_TOPICO.NEUTRO} nos neutros e{" "}
            {BLOCOS_POR_TOPICO.DIFICIL} nos que você tem dificuldade. Se só
            alguns tópicos fogem da regra, ajuste-os um a um. As alterações são
            salvas na hora.
          </p>
        </div>
        <AfinidadeMaterias materias={materias} />
        <Button
          size="lg"
          className="h-11 w-full sm:w-auto"
          render={<Link href={`/concursos/${id}/agenda`} />}
        >
          <CalendarDays aria-hidden />
          Ver minha agenda
        </Button>
      </main>
    </>
  );
}
