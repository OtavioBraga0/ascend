import { NextResponse, type NextRequest } from "next/server";

import {
  ROTA_LINK_INDISPONIVEL,
  tokenDoCaminho,
  tokenTemFormato,
} from "@/lib/compartilhamento";
import { linkAtivo } from "@/server/data/compartilhamento";

const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];
const PUBLIC_PATHS = ["/login", "/login/codigo", "/offline"];
// Pré-visualização de estruturas compartilhadas: aberta a quem não tem conta.
const PUBLIC_PREFIXES = ["/c/"];

/**
 * Checagem otimista: só verifica se existe cookie de sessão. A validação real
 * da sessão acontece no servidor, em `requireUser()`.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Link de compartilhamento inexistente ou desativado responde 404. A checagem
  // tem de ser aqui: dentro da página, o status já saiu como 200 no shell.
  const token = tokenDoCaminho(pathname);
  if (token !== null && !(await linkDisponivel(token))) {
    // A rota de destino chama `notFound()` no prerender, que define o 404.
    return NextResponse.rewrite(new URL(ROTA_LINK_INDISPONIVEL, request.url));
  }

  if (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefixo) => pathname.startsWith(prefixo))
  )
    return NextResponse.next();

  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

/** Formato impossível nem consulta o banco. Se o banco falhar, a página decide. */
async function linkDisponivel(token: string) {
  if (!tokenTemFormato(token)) return false;
  try {
    return await linkAtivo(token);
  } catch (erro) {
    console.error("[proxy] falha ao checar link compartilhado", erro);
    return true;
  }
}

export const config = {
  // Tudo, exceto /api/auth, arquivos internos do Next e arquivos estáticos (com extensão).
  matcher: ["/((?!api/auth|_next/static|_next/image|.*\\.[\\w]+$).*)"],
};
