"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  ajusteMateriaSchema,
  ordemMateriasSchema,
} from "@/lib/validacao/materia";
import { requireUser } from "@/server/auth";
import { ajustarMateria, reordenarMaterias } from "@/server/data/materias";

type Resultado = { error?: string };

const idSchema = z.string().min(1).max(64);

function revalidarConcurso(concursoId: string) {
  revalidatePath(`/concursos/${concursoId}`, "layout");
  revalidatePath("/concursos");
}

export async function ajustarMateriaAction(
  materiaId: string,
  ajuste: unknown,
): Promise<Resultado> {
  const user = await requireUser();
  const id = idSchema.safeParse(materiaId);
  const parsed = ajusteMateriaSchema.safeParse(ajuste);
  if (!id.success || !parsed.success)
    return { error: "Não foi possível salvar o ajuste." };

  const concursoId = await ajustarMateria(user.id, id.data, parsed.data);
  if (!concursoId) return { error: "Matéria não encontrada." };
  revalidarConcurso(concursoId);
  return {};
}

export async function reordenarMateriasAction(
  concursoId: string,
  ids: unknown,
): Promise<Resultado> {
  const user = await requireUser();
  const id = idSchema.safeParse(concursoId);
  const parsed = ordemMateriasSchema.safeParse(ids);
  if (!id.success || !parsed.success)
    return { error: "Não foi possível reordenar." };

  const ok = await reordenarMaterias(user.id, id.data, parsed.data);
  if (!ok)
    return {
      error: "As matérias mudaram. Recarregue a página e tente de novo.",
    };
  revalidarConcurso(id.data);
  return {};
}
