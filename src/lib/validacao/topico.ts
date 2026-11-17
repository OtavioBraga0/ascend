import { z } from "zod";

import { StatusTopico } from "@/generated/prisma/enums";

export const MAX_LINKS = 20;
export const MAX_NOTA = 5000;

/** Aceita "site.com/x" e completa com https://. */
export function normalizarLink(link: string): string {
  const texto = link.trim();
  return /^[a-z][a-z\d+.-]*:\/\//i.test(texto) ? texto : `https://${texto}`;
}

export const LINK_INVALIDO =
  "Link inválido. Use um endereço como planalto.gov.br/lei.";

/**
 * Normaliza e valida um link: só http(s), com domínio de verdade (ponto e
 * TLD com 2 letras ou mais). Devolve o link normalizado ou `null`.
 */
export function validarLink(link: string): string | null {
  const normalizado = normalizarLink(link);
  if (!URL.canParse(normalizado)) return null;
  const { protocol, hostname } = new URL(normalizado);
  if (protocol !== "http:" && protocol !== "https:") return null;
  if (!/\.[a-z]{2,}$/i.test(hostname)) return null;
  return normalizado;
}

export const statusSchema = z.enum(StatusTopico, "Status inválido.");

const linkSchema = z
  .string()
  .trim()
  .min(1)
  .max(2000)
  .transform((link, ctx) => {
    const valido = validarLink(link);
    if (!valido) {
      ctx.addIssue({ code: "custom", message: LINK_INVALIDO });
      return z.NEVER;
    }
    return valido;
  });

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
