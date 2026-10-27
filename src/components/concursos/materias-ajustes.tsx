"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useEffect, useOptimistic, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { Prioridade } from "@/generated/prisma/enums";
import { chamarAction } from "@/lib/chamar-action";
import { PESO_MAX, PESO_MIN } from "@/lib/revisao-edital";
import {
  moverNaLista,
  PRIORIDADE_LABEL,
  PRIORIDADES,
} from "@/lib/validacao/materia";
import {
  ajustarMateriaAction,
  reordenarMateriasAction,
} from "@/server/actions/materias";
import type { MateriaAjustes } from "@/server/data/materias";

type Mudanca =
  | { tipo: "ajuste"; id: string; peso: number; prioridade: Prioridade }
  | { tipo: "ordem"; ids: string[] };

function aplicar(
  materias: MateriaAjustes[],
  mudanca: Mudanca,
): MateriaAjustes[] {
  if (mudanca.tipo === "ajuste") {
    return materias.map((m) =>
      m.id === mudanca.id
        ? { ...m, peso: mudanca.peso, prioridade: mudanca.prioridade }
        : m,
    );
  }
  const porId = new Map(materias.map((m) => [m.id, m]));
  return mudanca.ids.flatMap((id) => porId.get(id) ?? []);
}

const PESOS = Array.from(
  { length: PESO_MAX - PESO_MIN + 1 },
  (_, i) => PESO_MIN + i,
);

const SELECT =
  "h-10 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

/** Peso, prioridade e ordem das matérias, salvos a cada mudança. */
export function MateriasAjustes({
  concursoId,
  materias,
}: {
  concursoId: string;
  materias: MateriaAjustes[];
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

  function ajustar(
    materia: MateriaAjustes,
    ajuste: { peso?: number; prioridade?: Prioridade },
  ) {
    const novo = {
      peso: ajuste.peso ?? materia.peso,
      prioridade: ajuste.prioridade ?? materia.prioridade,
    };
    executar(
      { tipo: "ajuste", id: materia.id, ...novo },
      () => ajustarMateriaAction(materia.id, novo),
      `${materia.nome}: salvo.`,
    );
  }

  function mover(indice: number, direcao: -1 | 1) {
    const ids = moverNaLista(
      otimista.map((m) => m.id),
      indice,
      direcao,
    );
    executar(
      { tipo: "ordem", ids },
      () => reordenarMateriasAction(concursoId, ids),
      `${otimista[indice].nome} movida para a posição ${indice + direcao + 1}.`,
    );
  }

  return (
    <div className="space-y-3">
      <ol className="space-y-2">
        {otimista.map((materia, indice) => (
          <li key={materia.id} className="space-y-3 rounded-xl border p-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium break-words">{materia.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {materia._count.topicos}{" "}
                  {materia._count.topicos === 1 ? "tópico" : "tópicos"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 shrink-0"
                disabled={indice === 0}
                onClick={() => mover(indice, -1)}
                aria-label={`Mover ${materia.nome} para cima`}
              >
                <ArrowUp aria-hidden />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 shrink-0"
                disabled={indice === otimista.length - 1}
                onClick={() => mover(indice, 1)}
                aria-label={`Mover ${materia.nome} para baixo`}
              >
                <ArrowDown aria-hidden />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1 text-xs text-muted-foreground">
                Peso
                <select
                  value={materia.peso}
                  onChange={(e) =>
                    ajustar(materia, { peso: Number(e.target.value) })
                  }
                  className={SELECT}
                >
                  {PESOS.map((peso) => (
                    <option key={peso} value={peso}>
                      {peso}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">
                Prioridade
                <select
                  value={materia.prioridade}
                  onChange={(e) =>
                    ajustar(materia, {
                      prioridade: e.target.value as Prioridade,
                    })
                  }
                  className={SELECT}
                >
                  {PRIORIDADES.map((prioridade) => (
                    <option key={prioridade} value={prioridade}>
                      {PRIORIDADE_LABEL[prioridade]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </li>
        ))}
      </ol>
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
