import { normalizarTexto } from "@/lib/parser-edital";

export const MIN_CARACTERES = 50;
export const MAX_CARACTERES = 120_000;

export const MENSAGEM_TEXTO_CURTO =
  "O texto está muito curto. Cole o conteúdo programático do edital.";
export const MENSAGEM_TEXTO_GRANDE =
  "O texto está muito grande. Cole só a parte do conteúdo programático.";

/**
 * Normaliza o texto como o parser (gasta menos tokens e deixa a verificação
 * de fidelidade mais confiável) e confere os limites de tamanho.
 */
export function prepararTexto(
  texto: string,
): { ok: true; texto: string } | { ok: false; mensagem: string } {
  const normalizado = normalizarTexto(texto);
  if (normalizado.length < MIN_CARACTERES)
    return { ok: false, mensagem: MENSAGEM_TEXTO_CURTO };
  if (normalizado.length > MAX_CARACTERES)
    return { ok: false, mensagem: MENSAGEM_TEXTO_GRANDE };
  return { ok: true, texto: normalizado };
}
