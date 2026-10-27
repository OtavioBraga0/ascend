import { z } from "zod";

import { PESO_MAX, PESO_MIN } from "@/lib/revisao-edital";

export const MAX_MATERIAS = 60;
export const MAX_TOPICOS_POR_MATERIA = 500;
export const MAX_TOPICOS = 3000;

// Id de item já salvo (para manter o progresso); ids desconhecidos viram itens novos.
const idOpcional = z.string().max(64).optional();

export const editalSchema = z
  .array(
    z.object({
      id: idOpcional,
      nome: z.string().trim().min(1, "Há matérias sem nome.").max(200),
      peso: z.int().min(PESO_MIN).max(PESO_MAX),
      topicos: z
        .array(
          z.object({
            id: idOpcional,
            titulo: z.string().trim().min(1, "Há tópicos sem texto.").max(1000),
          }),
        )
        .max(
          MAX_TOPICOS_POR_MATERIA,
          `Use no máximo ${MAX_TOPICOS_POR_MATERIA} tópicos por matéria.`,
        ),
    }),
  )
  .min(1, "Adicione pelo menos uma matéria.")
  .max(MAX_MATERIAS, `Use no máximo ${MAX_MATERIAS} matérias.`)
  .refine(
    (materias) =>
      materias.reduce((total, m) => total + m.topicos.length, 0) <= MAX_TOPICOS,
    `Use no máximo ${MAX_TOPICOS} tópicos no total.`,
  );

export type EditalInput = z.output<typeof editalSchema>;
