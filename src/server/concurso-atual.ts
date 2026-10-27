import "server-only";

import { notFound } from "next/navigation";

import { requireUser } from "@/server/auth";
import { getConcurso } from "@/server/data/concursos";

/** Concurso da URL, garantindo que pertence ao usuário logado (404 caso contrário). */
export async function requireConcurso(id: string) {
  const user = await requireUser();
  const concurso = await getConcurso(user.id, id);
  if (!concurso) notFound();
  return concurso;
}
