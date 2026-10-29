import Link from "next/link";

import { formatarHora, type BlocoAgenda } from "@/lib/agenda";

/** Blocos de um dia de estudo; cada um abre a matéria no edital. */
export function BlocosDia({
  concursoId,
  blocos,
}: {
  concursoId: string;
  blocos: BlocoAgenda[];
}) {
  return (
    <ol className="divide-y">
      {blocos.map((bloco) => (
        <li key={bloco.inicio}>
          <Link
            href={`/concursos/${concursoId}/edital?materia=${bloco.materiaId}`}
            className="-mx-2 flex gap-3 rounded-lg px-2 py-2.5 outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="w-12 shrink-0 text-sm tabular-nums">
              {formatarHora(bloco.inicio)}
              <span className="block text-xs text-muted-foreground">
                {formatarHora(bloco.fim)}
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-muted-foreground">
                {bloco.materiaNome}
              </span>
              <span className="block text-sm font-medium break-words">
                {bloco.topicoTitulo}
              </span>
              {bloco.partes > 1 && (
                <span className="block text-xs text-muted-foreground">
                  Bloco {bloco.parte} de {bloco.partes}
                </span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
