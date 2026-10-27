"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  concursoSchema,
  lerConcursoForm,
  type ConcursoFormValues,
} from "@/lib/validacao/concurso";
import { requireUser } from "@/server/auth";
import * as concursos from "@/server/data/concursos";

export type ConcursoFormState = {
  values?: ConcursoFormValues;
  fieldErrors?: Partial<Record<keyof ConcursoFormValues, string[]>>;
  error?: string;
  savedAt?: number;
};

const NAO_ENCONTRADO = "Concurso não encontrado.";

const idSchema = z.string().min(1).max(64);

function validar(formData: FormData) {
  const values = lerConcursoForm(formData);
  const parsed = concursoSchema.safeParse(values);
  return { values, parsed };
}

export async function criarConcurso(
  _prev: ConcursoFormState,
  formData: FormData,
): Promise<ConcursoFormState> {
  const user = await requireUser();
  const { values, parsed } = validar(formData);
  if (!parsed.success) {
    return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const id = await concursos.createConcurso(user.id, parsed.data);
  revalidatePath("/concursos");
  redirect(`/concursos/${id}/importar`);
}

export async function editarConcurso(
  id: string,
  _prev: ConcursoFormState,
  formData: FormData,
): Promise<ConcursoFormState> {
  const user = await requireUser();
  const { values, parsed } = validar(formData);
  if (!parsed.success) {
    return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const ok =
    idSchema.safeParse(id).success &&
    (await concursos.updateConcurso(user.id, id, parsed.data));
  if (!ok) return { values, error: NAO_ENCONTRADO };

  revalidatePath("/concursos", "layout");
  return { values, savedAt: Date.now() };
}

export async function excluirConcurso(id: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const ok =
    idSchema.safeParse(id).success &&
    (await concursos.deleteConcurso(user.id, id));
  if (!ok) return { error: NAO_ENCONTRADO };

  revalidatePath("/concursos", "layout");
  redirect("/concursos");
}
