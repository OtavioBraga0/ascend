/** Para onde o login leva quando não há destino pedido. */
export const DESTINO_PADRAO = "/concursos";

/**
 * Destino após o login (`?voltar=`). Só aceita caminhos deste site, para o
 * parâmetro não virar um redirecionamento aberto para outro domínio.
 */
export function destinoSeguro(valor: unknown): string {
  if (typeof valor !== "string" || !valor.startsWith("/"))
    return DESTINO_PADRAO;
  try {
    // A URL normaliza truques como `//site`, `/\site` e tabs no meio.
    const url = new URL(valor, "http://ascend.local");
    if (url.host !== "ascend.local") return DESTINO_PADRAO;
    return url.pathname + url.search;
  } catch {
    return DESTINO_PADRAO;
  }
}

/** `?voltar=...` para anexar a links do login; vazio para o destino padrão. */
export function parametroVoltar(destino: string): string {
  return destino === DESTINO_PADRAO
    ? ""
    : `?${new URLSearchParams({ voltar: destino })}`;
}
