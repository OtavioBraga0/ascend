"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { editalSchema } from "@/lib/validacao/edital";
import { requireUser } from "@/server/auth";
import { salvarEdital } from "@/server/data/edital";

const MENSAGENS = {
  "nao-encontrado": "Concurso não encontrado.",
  "ja-importado": "Este concurso já tem um edital salvo.",
} as const;

export async function salvarEditalAction(
  concursoId: string,
  materias: unknown,
): Promise<{ error: string }> {
  const user = await requireUser();
  const id = z.string().min(1).max(64).safeParse(concursoId);
  const parsed = editalSchema.safeParse(materias);
  if (!id.success) return { error: MENSAGENS["nao-encontrado"] };
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const resultado = await salvarEdital(user.id, id.data, parsed.data);
  if (resultado !== "ok") return { error: MENSAGENS[resultado] };

  revalidatePath(`/concursos/${id.data}`, "layout");
  redirect(`/concursos/${id.data}`);
}
