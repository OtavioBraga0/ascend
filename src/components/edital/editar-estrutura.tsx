"use client";

import { useRouter } from "next/navigation";

import { RevisaoEdital } from "@/components/edital/revisao-edital";
import type { MateriaRevisao } from "@/lib/revisao-edital";

/** Edição do edital já salvo, com a mesma tela da revisão da importação. */
export function EditarEstrutura({
  concursoId,
  materias,
}: {
  concursoId: string;
  materias: MateriaRevisao[];
}) {
  const router = useRouter();
  return (
    <RevisaoEdital
      concursoId={concursoId}
      inicial={materias}
      onVoltar={() => router.push(`/concursos/${concursoId}/configuracoes`)}
      aviso="O progresso dos tópicos é mantido, inclusive ao movê-los de matéria. Excluir um tópico ou uma matéria apaga o progresso dele."
    />
  );
}
