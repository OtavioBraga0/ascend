"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  lerRotinaForm,
  rotinaSchema,
  type RotinaFormValues,
} from "@/lib/validacao/rotina";
import { requireUser } from "@/server/auth";
import { salvarRotina } from "@/server/data/rotina";

export type RotinaFormState = {
  values?: RotinaFormValues;
  fieldErrors?: Partial<Record<keyof RotinaFormValues, string[]>>;
  savedAt?: number;
};

export async function salvarRotinaAction(
  _prev: RotinaFormState,
  formData: FormData,
): Promise<RotinaFormState> {
  const user = await requireUser();
  const values = lerRotinaForm(formData);
  const parsed = rotinaSchema.safeParse(values);
  if (!parsed.success) {
    return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  await salvarRotina(user.id, parsed.data);
  revalidatePath("/conta");
  revalidatePath("/concursos", "layout");
  return { values, savedAt: Date.now() };
}
