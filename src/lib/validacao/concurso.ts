import { z } from "zod";

import { CORES_IDS } from "@/lib/cores";
import { isIsoValido, isoParaData } from "@/lib/datas";

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use no máximo ${max} caracteres.`)
    .transform((valor) => valor || null);

export const concursoSchema = z.object({
  nome: z
    .string("Informe o nome do concurso.")
    .trim()
    .min(1, "Informe o nome do concurso.")
    .max(120, "Use no máximo 120 caracteres."),
  banca: textoOpcional(80),
  cargo: textoOpcional(80),
  dataProva: z
    .string()
    .trim()
    .refine((iso) => iso === "" || isIsoValido(iso), "Data inválida.")
    .transform((iso) => (iso ? isoParaData(iso) : null)),
  cor: z.enum(CORES_IDS, "Escolha uma cor."),
});

export type ConcursoInput = z.output<typeof concursoSchema>;

/** Valores do formulário como texto, para reexibir após um erro. */
export type ConcursoFormValues = Record<keyof ConcursoInput, string>;

export function lerConcursoForm(formData: FormData): ConcursoFormValues {
  const texto = (campo: string) => String(formData.get(campo) ?? "");
  return {
    nome: texto("nome"),
    banca: texto("banca"),
    cargo: texto("cargo"),
    dataProva: texto("dataProva"),
    cor: texto("cor"),
  };
}
