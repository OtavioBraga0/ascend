import { Prioridade, StatusTopico } from "@/generated/prisma/enums";
import { diasAte } from "@/lib/datas";

/** Quanto cada status vale no progresso (0 a 1). */
export const VALOR_STATUS: Record<StatusTopico, number> = {
  NAO_INICIADO: 0,
  TEORIA: 1 / 3,
  EXERCICIOS: 2 / 3,
  REVISADO: 1,
};

export const PESO_PRIORIDADE: Record<Prioridade, number> = {
  ALTA: 3,
  MEDIA: 2,
  BAIXA: 1,
};

type ComStatus = { status: StatusTopico };
type MateriaComTopicos<T extends ComStatus = ComStatus> = {
  peso: number;
  prioridade: Prioridade;
  ordem: number;
  topicos: T[];
};

/** Média dos valores dos tópicos (0 a 1); matéria sem tópicos vale 0. */
export function progressoMateria(topicos: ComStatus[]): number {
  if (topicos.length === 0) return 0;
  return (
    topicos.reduce((soma, t) => soma + VALOR_STATUS[t.status], 0) /
    topicos.length
  );
}

/** Média dos progressos das matérias ponderada pelo peso (0 a 1). */
export function progressoConcurso(
  materias: { peso: number; topicos: ComStatus[] }[],
): number {
  const pesoTotal = materias.reduce((soma, m) => soma + m.peso, 0);
  if (pesoTotal === 0) return 0;
  return (
    materias.reduce(
      (soma, m) => soma + m.peso * progressoMateria(m.topicos),
      0,
    ) / pesoTotal
  );
}

/** Concluídos = tópicos revisados. */
export function contarRevisados(topicos: ComStatus[]): number {
  return topicos.filter((t) => t.status === StatusTopico.REVISADO).length;
}

export function contarPorStatus(
  topicos: ComStatus[],
): Record<StatusTopico, number> {
  const contagem = { NAO_INICIADO: 0, TEORIA: 0, EXERCICIOS: 0, REVISADO: 0 };
  for (const t of topicos) contagem[t.status]++;
  return contagem;
}

/** Dias inteiros até a prova no fuso de São Paulo; `null` sem data. */
export function diasAteProva(
  dataProva: Date | null,
  agora: Date = new Date(),
): number | null {
  return dataProva ? diasAte(dataProva, agora) : null;
}

/**
 * Tópicos não revisados ÷ dias até a prova. `null` sem data ou se a prova já
 * passou; no dia da prova, conta como 1 dia.
 */
export function ritmoNecessario(
  naoRevisados: number,
  dias: number | null,
): number | null {
  if (dias === null || dias < 0) return null;
  return naoRevisados / Math.max(dias, 1);
}

export function formatarRitmo(ritmo: number): string {
  const valor = ritmo.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return `${valor} ${ritmo === 1 ? "tópico/dia" : "tópicos/dia"}`;
}

/** Percentual inteiro para exibição (0 a 100). */
export function emPercentual(progresso: number): number {
  return Math.round(progresso * 100);
}

/** Ordem do painel: maior prioridade primeiro, depois menor progresso. */
export function ordenarParaPainel<M extends MateriaComTopicos>(
  materias: M[],
): M[] {
  return [...materias].sort(
    (a, b) =>
      PESO_PRIORIDADE[b.prioridade] - PESO_PRIORIDADE[a.prioridade] ||
      progressoMateria(a.topicos) - progressoMateria(b.topicos) ||
      a.ordem - b.ordem,
  );
}

/**
 * "Continuar estudando": primeiro tópico não revisado da matéria de maior
 * prioridade (empate: maior peso, depois a ordem do edital).
 */
export function proximoTopico<
  M extends MateriaComTopicos<ComStatus & { ordem: number }>,
>(materias: M[]): { materia: M; topico: M["topicos"][number] } | null {
  const candidatas = [...materias].sort(
    (a, b) =>
      PESO_PRIORIDADE[b.prioridade] - PESO_PRIORIDADE[a.prioridade] ||
      b.peso - a.peso ||
      a.ordem - b.ordem,
  );
  for (const materia of candidatas) {
    const topico = [...materia.topicos]
      .sort((a, b) => a.ordem - b.ordem)
      .find((t) => t.status !== StatusTopico.REVISADO);
    if (topico) return { materia, topico };
  }
  return null;
}
