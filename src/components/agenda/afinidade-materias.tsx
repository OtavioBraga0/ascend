"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useOptimistic, useState, useTransition } from "react";

import type { Dificuldade } from "@/generated/prisma/enums";
import { chamarAction } from "@/lib/chamar-action";
import { cn } from "@/lib/utils";
import { DIFICULDADE_LABEL, DIFICULDADES } from "@/lib/validacao/materia";
import { definirDificuldadeMateriaAction } from "@/server/actions/materias";
import { definirDificuldadeTopico } from "@/server/actions/topicos";
import type { MateriaAfinidade } from "@/server/data/materias";

type Mudanca =
  | { tipo: "materia"; id: string; dificuldade: Dificuldade }
  | { tipo: "topico"; id: string; dificuldade: Dificuldade | null };

function aplicar(
  materias: MateriaAfinidade[],
  mudanca: Mudanca,
): MateriaAfinidade[] {
  if (mudanca.tipo === "materia") {
    return materias.map((m) =>
      m.id === mudanca.id ? { ...m, dificuldade: mudanca.dificuldade } : m,
    );
  }
  return materias.map((m) => ({
    ...m,
    topicos: m.topicos.map((t) =>
      t.id === mudanca.id ? { ...t, dificuldade: mudanca.dificuldade } : t,
    ),
  }));
}

/** Rótulo curto para caber no select do tópico em telas estreitas. */
const DIFICULDADE_CURTA: Record<Dificuldade, string> = {
  FACIL: "domino",
  NEUTRO: "neutro",
  DIFICIL: "difícil",
};

const SELECT =
  "h-9 w-40 shrink-0 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

/** Afinidade com cada matéria e, opcionalmente, com tópicos específicos. */
export function AfinidadeMaterias({
  materias,
}: {
  materias: MateriaAfinidade[];
}) {
  const [otimista, mudar] = useOptimistic(materias, aplicar);
  const [, startTransition] = useTransition();
  const [erro, setErro] = useState<string>();
  const [aviso, setAviso] = useState<string>();

  useEffect(() => {
    if (!aviso) return;
    const timer = setTimeout(() => setAviso(undefined), 3000);
    return () => clearTimeout(timer);
  }, [aviso]);

  function executar(
    mudanca: Mudanca,
    acao: () => Promise<{ error?: string }>,
    mensagem: string,
  ) {
    setErro(undefined);
    startTransition(async () => {
      mudar(mudanca);
      const resultado = await chamarAction(acao);
      if (resultado.error) setErro(resultado.error);
      else setAviso(mensagem);
    });
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {otimista.map((materia) => {
          const ajustados = materia.topicos.filter(
            (t) => t.dificuldade !== null,
          ).length;
          return (
            <li key={materia.id} className="space-y-3 rounded-xl border p-3">
              <fieldset className="space-y-2">
                <legend className="font-medium break-words">
                  {materia.nome}
                </legend>
                <div className="grid grid-cols-3 gap-1.5">
                  {DIFICULDADES.map((dificuldade) => (
                    <label key={dificuldade} className="cursor-pointer">
                      <input
                        type="radio"
                        name={`dificuldade-${materia.id}`}
                        value={dificuldade}
                        checked={materia.dificuldade === dificuldade}
                        onChange={() =>
                          executar(
                            { tipo: "materia", id: materia.id, dificuldade },
                            () =>
                              definirDificuldadeMateriaAction(
                                materia.id,
                                dificuldade,
                              ),
                            `${materia.nome}: ${DIFICULDADE_LABEL[dificuldade].toLowerCase()}.`,
                          )
                        }
                        className="peer sr-only"
                      />
                      <span
                        className={cn(
                          "flex min-h-10 items-center justify-center rounded-lg border px-1 text-center text-xs leading-tight font-medium transition-colors sm:text-sm",
                          "peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground",
                          "peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
                        )}
                      >
                        {DIFICULDADE_LABEL[dificuldade]}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {materia.topicos.length > 0 && (
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-1 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground [&::-webkit-details-marker]:hidden">
                    <ChevronDown
                      className="size-4 transition-transform group-open:rotate-180"
                      aria-hidden
                    />
                    Ajustar tópicos
                    {ajustados > 0 && ` (${ajustados} ajustados)`}
                  </summary>
                  <ul className="mt-2 divide-y">
                    {materia.topicos.map((topico) => (
                      <li
                        key={topico.id}
                        className="flex items-center gap-2 py-2"
                      >
                        <span className="min-w-0 flex-1 text-sm break-words">
                          {topico.titulo}
                        </span>
                        <select
                          aria-label={`Afinidade com ${topico.titulo}`}
                          value={topico.dificuldade ?? ""}
                          onChange={(e) => {
                            const dificuldade =
                              (e.target.value as Dificuldade) || null;
                            executar(
                              { tipo: "topico", id: topico.id, dificuldade },
                              () =>
                                definirDificuldadeTopico(
                                  topico.id,
                                  dificuldade,
                                ),
                              `${topico.titulo}: salvo.`,
                            );
                          }}
                          className={SELECT}
                        >
                          <option value="">
                            {`Padrão (${DIFICULDADE_CURTA[materia.dificuldade]})`}
                          </option>
                          {DIFICULDADES.map((dificuldade) => (
                            <option key={dificuldade} value={dificuldade}>
                              {DIFICULDADE_LABEL[dificuldade]}
                            </option>
                          ))}
                        </select>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          );
        })}
      </ul>
      <p
        role="status"
        aria-live="polite"
        className="min-h-5 text-sm text-muted-foreground"
      >
        {erro ? (
          <span className="text-destructive">
            {erro} A alteração foi desfeita.
          </span>
        ) : (
          aviso
        )}
      </p>
    </div>
  );
}
