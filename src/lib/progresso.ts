import { StatusTopico } from "@/generated/prisma/enums";

/** Quanto cada status vale no progresso (0 a 1). */
export const VALOR_STATUS: Record<StatusTopico, number> = {
  NAO_INICIADO: 0,
  TEORIA: 1 / 3,
  EXERCICIOS: 2 / 3,
  REVISADO: 1,
};

type ComStatus = { status: StatusTopico };

/** Média dos valores dos tópicos (0 a 1); matéria sem tópicos vale 0. */
export function progressoMateria(topicos: ComStatus[]): number {
  if (topicos.length === 0) return 0;
  return (
    topicos.reduce((soma, t) => soma + VALOR_STATUS[t.status], 0) /
    topicos.length
  );
}

export function contarRevisados(topicos: ComStatus[]): number {
  return topicos.filter((t) => t.status === StatusTopico.REVISADO).length;
}

/** Percentual inteiro para exibição (0 a 100). */
export function emPercentual(progresso: number): number {
  return Math.round(progresso * 100);
}
