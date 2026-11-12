import "server-only";

import { redirect } from "next/navigation";
import { connection } from "next/server";

import { auth } from "@/auth";

export type CurrentUser = { id: string; email: string; name: string | null };

/**
 * Usuário da sessão atual; redireciona para /login se não houver sessão válida.
 * Toda leitura/escrita em `src/server/data` deve usar o `id` retornado aqui.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getOptionalUser();
  if (!user) redirect("/login");
  return user;
}

/** Usuário da sessão, ou `null` sem sessão (para páginas públicas). */
export async function getOptionalUser(): Promise<CurrentUser | null> {
  // O Auth.js usa crypto antes de ler os cookies; marca o render como dinâmico antes.
  await connection();
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.email) return null;
  return { id: user.id, email: user.email, name: user.name ?? null };
}
