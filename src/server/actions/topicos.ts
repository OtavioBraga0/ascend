"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { detalhesTopicoSchema, statusSchema } from "@/lib/validacao/topico";
import { requireUser } from "@/server/auth";
import {
  atualizarDetalhesTopico,
  atualizarStatusTopico,
} from "@/server/data/topicos";

type Resultado = { error?: string };

const idSchema = z.string().min(1).max(64);
const NAO_ENCONTRADO = "Tópico não encontrado.";

function revalidarConcurso(concursoId: string) {
  revalidatePath(`/concursos/${concursoId}`, "layout");
  revalidatePath("/concursos");
}

export async function alterarStatus(
  topicoId: string,
  status: unknown,
): Promise<Resultado> {
  const user = await requireUser();
  const id = idSchema.safeParse(topicoId);
  const novoStatus = statusSchema.safeParse(status);
  if (!id.success || !novoStatus.success)
    return { error: "Não foi possível alterar o status." };

  const concursoId = await atualizarStatusTopico(
    user.id,
    id.data,
    novoStatus.data,
  );
  if (!concursoId) return { error: NAO_ENCONTRADO };
  revalidarConcurso(concursoId);
  return {};
}

export async function salvarDetalhes(
  topicoId: string,
  detalhes: unknown,
): Promise<Resultado> {
  const user = await requireUser();
  const id = idSchema.safeParse(topicoId);
  const parsed = detalhesTopicoSchema.safeParse(detalhes);
  if (!id.success) return { error: NAO_ENCONTRADO };
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const concursoId = await atualizarDetalhesTopico(
    user.id,
    id.data,
    parsed.data,
  );
  if (!concursoId) return { error: NAO_ENCONTRADO };
  revalidarConcurso(concursoId);
  return {};
}
