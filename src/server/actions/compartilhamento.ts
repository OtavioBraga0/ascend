"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { parametroVoltar } from "@/lib/destino-login";
import { getOptionalUser, requireUser } from "@/server/auth";
import {
  ativarCompartilhamento,
  copiarEstrutura,
  desativarCompartilhamento,
} from "@/server/data/compartilhamento";

type Resultado = { error?: string };

const idSchema = z.string().min(1).max(64);
const NAO_ENCONTRADO = "Concurso não encontrado.";

export async function compartilharAction(
  concursoId: string,
): Promise<Resultado & { token?: string }> {
  const user = await requireUser();
  const id = idSchema.safeParse(concursoId);
  const token = id.success && (await ativarCompartilhamento(user.id, id.data));
  if (!token) return { error: NAO_ENCONTRADO };
  revalidatePath(`/concursos/${id.data}/configuracoes`);
  return { token };
}

export async function pararCompartilhamentoAction(
  concursoId: string,
): Promise<Resultado> {
  const user = await requireUser();
  const id = idSchema.safeParse(concursoId);
  const ok = id.success && (await desativarCompartilhamento(user.id, id.data));
  if (!ok) return { error: NAO_ENCONTRADO };
  revalidatePath(`/concursos/${id.data}/configuracoes`);
  return {};
}

export async function copiarEstruturaAction(token: string): Promise<Resultado> {
  const parsed = idSchema.safeParse(token);
  if (!parsed.success) return { error: "Este link não está mais disponível." };
  // A página é pública: sem sessão, entra e volta para o mesmo link.
  const user = await getOptionalUser();
  if (!user) redirect(`/login${parametroVoltar(`/c/${parsed.data}`)}`);

  const resultado = await copiarEstrutura(user.id, parsed.data);
  if ("erro" in resultado) {
    return {
      error:
        resultado.erro === "proprio"
          ? "Este concurso já é seu."
          : "Este link não está mais disponível.",
    };
  }
  revalidatePath("/concursos", "layout");
  redirect(`/concursos/${resultado.concursoId}/afinidade?copiado=1`);
}
