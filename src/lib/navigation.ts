export type NavKey = "concursos" | "painel" | "edital" | "conta";

/** Id do concurso aberto na URL (`/concursos/[id]/...`), se houver. */
export function concursoIdFromPath(pathname: string): string | null {
  const match = /^\/concursos\/([^/]+)/.exec(pathname);
  if (!match || match[1] === "novo") return null;
  return match[1];
}

/**
 * Destino de cada item da navegação. Painel e Edital dependem de um concurso
 * aberto; sem ele, levam à lista para o usuário escolher um.
 */
export function navHrefs(pathname: string): Record<NavKey, string> {
  const id = concursoIdFromPath(pathname);
  return {
    concursos: "/concursos",
    painel: id ? `/concursos/${id}` : "/concursos",
    edital: id ? `/concursos/${id}/edital` : "/concursos",
    conta: "/conta",
  };
}

export function activeNavKey(pathname: string): NavKey | null {
  if (pathname === "/conta" || pathname.startsWith("/conta/")) return "conta";
  const id = concursoIdFromPath(pathname);
  if (id) {
    return pathname.startsWith(`/concursos/${id}/edital`) ? "edital" : "painel";
  }
  if (pathname.startsWith("/concursos")) return "concursos";
  return null;
}
