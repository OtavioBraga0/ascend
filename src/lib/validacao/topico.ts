import { z } from "zod";

import { StatusTopico } from "@/generated/prisma/enums";

export const MAX_LINKS = 20;
export const MAX_NOTA = 5000;

/** Aceita "site.com/x" e completa com https://. */
export function normalizarLink(link: string): string {
  const texto = link.trim();
  return /^[a-z][a-z\d+.-]*:\/\//i.test(texto) ? texto : `https://${texto}`;
}

export const statusSchema = z.enum(StatusTopico, "Status inválido.");

const linkSchema = z
  .string()
  .trim()
  .min(1)
  .max(2000)
  .transform(normalizarLink)
  .pipe(z.url({ protocol: /^https?$/, error: "Link inválido." }));

export const detalhesTopicoSchema = z.object({
  status: statusSchema,
  nota: z
    .string()
    .max(MAX_NOTA, `Use no máximo ${MAX_NOTA} caracteres.`)
    .transform((nota) => nota.trim() || null),
  links: z
    .array(linkSchema)
    .max(MAX_LINKS, `Use no máximo ${MAX_LINKS} links.`),
});

export type DetalhesTopico = z.output<typeof detalhesTopicoSchema>;
