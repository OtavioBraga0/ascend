/** Tokens de link: 16 bytes em base64url (veja `novoToken`), 22 caracteres. */
const FORMATO_TOKEN = /^[A-Za-z0-9_-]{22}$/;

/** Rota servida quando o link de compartilhamento não existe ou foi desativado. */
export const ROTA_LINK_INDISPONIVEL = "/c/indisponivel";

/** Token de `/c/<token>`, ou `null` se o caminho não for de um link. */
export function tokenDoCaminho(pathname: string): string | null {
  const achado = /^\/c\/([^/]+)\/?$/.exec(pathname);
  if (!achado || achado[0].replace(/\/$/, "") === ROTA_LINK_INDISPONIVEL)
    return null;
  return decodeURIComponent(achado[1]);
}

/** O token tem o formato dos que o app gera (não consulta o banco). */
export function tokenTemFormato(token: string): boolean {
  return FORMATO_TOKEN.test(token);
}
