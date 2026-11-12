import { NextResponse, type NextRequest } from "next/server";

import { handlers, OTP_PROVIDER_ID } from "@/auth";
import { destinoSeguro, DESTINO_PADRAO } from "@/lib/destino-login";
import { normalizeEmail } from "@/lib/otp";
import { consumeAttempt } from "@/server/data/auth-attempts";

const OTP_CALLBACK_PATH = `/api/auth/callback/${OTP_PROVIDER_ID}`;

export const { POST } = handlers;

export async function GET(request: NextRequest) {
  if (request.nextUrl.pathname !== OTP_CALLBACK_PATH) {
    return handlers.GET(request);
  }

  // Validação do código: aplica o limite de tentativas mesmo para quem
  // chama o callback direto, sem passar pela tela de código.
  const email = normalizeEmail(request.nextUrl.searchParams.get("email") ?? "");
  const backToCode = (erro: "codigo" | "limite" | "falha") => {
    const url = new URL("/login/codigo", request.nextUrl.origin);
    url.searchParams.set("email", email);
    url.searchParams.set("erro", erro);
    const voltar = destinoSeguro(
      request.nextUrl.searchParams.get("callbackUrl"),
    );
    if (voltar !== DESTINO_PADRAO) url.searchParams.set("voltar", voltar);
    return NextResponse.redirect(url);
  };

  if (!email) return backToCode("codigo");
  if (!(await consumeAttempt(email, "verify"))) return backToCode("limite");

  const response = await handlers.GET(request);
  const location = response.headers.get("location");
  const erro =
    location &&
    new URL(location, request.nextUrl.origin).searchParams.get("error");
  // Só "Verification" é código errado ou expirado; o resto (banco, adaptador)
  // não é culpa do código e não deve ser apresentado como tal.
  if (erro) return backToCode(erro === "Verification" ? "codigo" : "falha");
  return response;
}
