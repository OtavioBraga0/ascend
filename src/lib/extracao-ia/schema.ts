import { z } from "zod";

/**
 * JSON Schema da resposta, enviado ao OpenRouter em modo `strict`: todo objeto
 * tem `additionalProperties: false` e todas as propriedades em `required`.
 */
export const EDITAL_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["materias", "avisos"],
  properties: {
    materias: {
      type: "array",
      description:
        "Matérias do conteúdo programático, na ordem em que aparecem no edital.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["nome", "topicos"],
        properties: {
          nome: {
            type: "string",
            description:
              "Nome da matéria, com as mesmas maiúsculas e minúsculas do edital.",
          },
          topicos: {
            type: "array",
            description:
              "Tópicos da matéria, copiados literalmente do edital e sem a numeração do começo, na ordem do edital.",
            items: { type: "string" },
          },
        },
      },
    },
    avisos: {
      type: "array",
      description:
        "Observações curtas sobre o texto (por exemplo, partes ignoradas). Pode ser vazio.",
      items: { type: "string" },
    },
  },
} as const;

/** O mesmo formato em Zod: a resposta é validada de novo do nosso lado. */
export const respostaEditalSchema = z.strictObject({
  materias: z.array(
    z.strictObject({
      nome: z.string().trim().min(1),
      topicos: z.array(z.string()),
    }),
  ),
  avisos: z.array(z.string()),
});

export type RespostaEdital = z.output<typeof respostaEditalSchema>;
