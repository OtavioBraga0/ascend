import { z } from "zod";

import { Dificuldade, Prioridade } from "@/generated/prisma/enums";
import { PESO_MAX, PESO_MIN } from "@/lib/revisao-edital";

export const PRIORIDADES = [
  Prioridade.ALTA,
  Prioridade.MEDIA,
  Prioridade.BAIXA,
] as const;

export const PRIORIDADE_LABEL: Record<Prioridade, string> = {
  ALTA: "Alta",
  MEDIA: "Média",
  BAIXA: "Baixa",
};

export const DIFICULDADES = [
  Dificuldade.FACIL,
  Dificuldade.NEUTRO,
  Dificuldade.DIFICIL,
] as const;

export const DIFICULDADE_LABEL: Record<Dificuldade, string> = {
  FACIL: "Domino",
  NEUTRO: "Neutro",
  DIFICIL: "Tenho dificuldade",
};

export const dificuldadeSchema = z.enum(Dificuldade);

/** Dificuldade de um tópico; `null` volta a usar a da matéria. */
export const dificuldadeTopicoSchema = dificuldadeSchema.nullable();

export const ajusteMateriaSchema = z.object({
  peso: z.int().min(PESO_MIN).max(PESO_MAX),
  prioridade: z.enum(Prioridade),
});

export type AjusteMateria = z.output<typeof ajusteMateriaSchema>;

export const ordemMateriasSchema = z
  .array(z.string().min(1).max(64))
  .min(1)
  .max(200);

/** Troca a matéria de posição com a vizinha (-1 sobe, +1 desce). */
export function moverNaLista<T>(
  lista: T[],
  indice: number,
  direcao: -1 | 1,
): T[] {
  const destino = indice + direcao;
  if (
    indice < 0 ||
    indice >= lista.length ||
    destino < 0 ||
    destino >= lista.length
  )
    return lista;
  const nova = [...lista];
  [nova[indice], nova[destino]] = [nova[destino], nova[indice]];
  return nova;
}
