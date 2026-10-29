export type NavKey = "concursos" | "painel" | "agenda" | "edital" | "conta";

/** Id do concurso aberto na URL (`/concursos/[id]/...`), se houver. */
export function concursoIdFromPath(pathname: string): string | null {
  const match = /^\/concursos\/([^/]+)/.exec(pathname);
  if (!match || match[1] === "novo") return null;
  return match[1];
}

/**
 * Concurso para Painel, Agenda e Edital quando a URL não tem um: o último
 * acessado (se ainda existir) ou, se o usuário tiver só um, esse.
 */
export function concursoPadrao(
  concursoIds: string[],
  ultimoAcessado: string | null,
): string | null {
  if (ultimoAcessado && concursoIds.includes(ultimoAcessado))
    return ultimoAcessado;
  return concursoIds.length === 1 ? concursoIds[0] : null;
}

/**
 * Destino de cada item da navegação. Painel, Agenda e Edital dependem de um
 * concurso: o da URL ou o padrão; sem nenhum, levam à lista para o usuário
 * escolher um.
 */
export function navHrefs(
  pathname: string,
  padrao: string | null = null,
): Record<NavKey, string> {
  const id = concursoIdFromPath(pathname) ?? padrao;
  return {
    concursos: "/concursos",
    painel: id ? `/concursos/${id}` : "/concursos",
    agenda: id ? `/concursos/${id}/agenda` : "/concursos",
    edital: id ? `/concursos/${id}/edital` : "/concursos",
    conta: "/conta",
  };
}

export function activeNavKey(pathname: string): NavKey | null {
  if (pathname === "/conta" || pathname.startsWith("/conta/")) return "conta";
  const id = concursoIdFromPath(pathname);
  if (id) {
    const secao = pathname.slice(`/concursos/${id}`.length);
    if (secao.startsWith("/edital")) return "edital";
    if (secao.startsWith("/agenda") || secao.startsWith("/afinidade"))
      return "agenda";
    return "painel";
  }
  if (pathname.startsWith("/concursos")) return "concursos";
  return null;
}
