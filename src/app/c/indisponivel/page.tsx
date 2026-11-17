import { notFound } from "next/navigation";

/**
 * Destino do Proxy quando o link de compartilhamento não existe ou foi
 * desativado. Chamar `notFound()` aqui, no prerender (antes de a resposta
 * começar), é o que faz a resposta sair com status 404; o texto vem de
 * `src/app/c/not-found.tsx`.
 */
export default function LinkIndisponivelPage() {
  notFound();
}
