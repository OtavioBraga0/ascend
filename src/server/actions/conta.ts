"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/server/auth";
import { updateUserName } from "@/server/data/users";

export type NameFormState = { error?: string; savedAt?: number };

const nameSchema = z
  .string()
  .trim()
  .max(80, "Use no máximo 80 caracteres.")
  .transform((name) => name || null);

export async function saveName(
  _prev: NameFormState,
  formData: FormData,
): Promise<NameFormState> {
  const user = await requireUser();
  const parsed = nameSchema.safeParse(formData.get("name") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await updateUserName(user.id, parsed.data);
  revalidatePath("/conta");
  return { savedAt: Date.now() };
}
