import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];
const PUBLIC_PATHS = ["/login", "/login/codigo"];

/**
 * Checagem otimista: só verifica se existe cookie de sessão. A validação real
 * da sessão acontece no servidor, em `requireUser()`.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Tudo, exceto /api/auth, arquivos internos do Next e arquivos estáticos (com extensão).
  matcher: ["/((?!api/auth|_next/static|_next/image|.*\\.[\\w]+$).*)"],
};
