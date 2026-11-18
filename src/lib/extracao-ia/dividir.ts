/**
 * Divide o edital em partes para extrair cada uma numa chamada separada.
 *
 * A resposta da IA tem quase o mesmo tamanho do texto (cada tópico é reescrito
 * no JSON), então um edital grande numa chamada só estoura o limite de tokens
 * de saída e o tempo da função. Partes menores cabem com folga e rodam em
 * paralelo.
 */

/** Tamanho máximo de cada parte, em caracteres (~4 mil tokens de resposta). */
export const TAMANHO_PARTE = 4_000;

/** Quanto do fim da parte anterior vai junto, para saber a matéria em andamento. */
export const TAMANHO_CONTEXTO = 1_000;

export type Parte = {
  texto: string;
  /** Final da parte anterior; vazio na primeira parte. */
  anterior: string;
};

/**
 * Corta em quebras de linha, de preferência antes de uma linha que parece
 * nome de matéria. Sem quebra de linha perto do limite, corta depois de ";"
 * ou ".", e em último caso num espaço. Juntas, as partes refazem o texto.
 */
export function dividirTexto(
  texto: string,
  tamanho = TAMANHO_PARTE,
  contexto = TAMANHO_CONTEXTO,
): Parte[] {
  const partes: Parte[] = [];
  let inicio = 0;
  while (inicio < texto.length) {
    const fim =
      texto.length - inicio <= tamanho
        ? texto.length
        : pontoDeCorte(texto, inicio, tamanho);
    partes.push({
      texto: texto.slice(inicio, fim),
      anterior: texto.slice(Math.max(0, inicio - contexto), inicio),
    });
    inicio = fim;
  }
  return partes;
}

function pontoDeCorte(texto: string, inicio: number, tamanho: number) {
  const limite = inicio + tamanho;
  // Não corta cedo demais: a parte tem pelo menos metade do tamanho.
  const minimo = inicio + Math.floor(tamanho / 2);
  const janela = texto.slice(minimo, limite);

  const quebras = [...janela.matchAll(/\n/g)].map((m) => minimo + m.index + 1);
  const antesDeTitulo = quebras.filter((pos) => {
    const fimDaLinha = texto.indexOf("\n", pos);
    return pareceTitulo(
      texto.slice(pos, fimDaLinha === -1 ? undefined : fimDaLinha),
    );
  });
  if (antesDeTitulo.length > 0) return antesDeTitulo.at(-1)!;
  if (quebras.length > 0) return quebras.at(-1)!;

  const frase = ultimo(janela, /[;.]\s+/g);
  if (frase !== null) return minimo + frase;
  const espaco = ultimo(janela, /\s+/g);
  if (espaco !== null) return minimo + espaco;
  return limite;
}

/** Posição logo depois da última ocorrência do padrão, ou `null`. */
function ultimo(texto: string, padrao: RegExp) {
  const ocorrencias = [...texto.matchAll(padrao)];
  const m = ocorrencias.at(-1);
  return m ? m.index + m[0].length : null;
}

/** Linha curta, sem minúsculas: provavelmente o nome de uma matéria. */
function pareceTitulo(linha: string) {
  const letras = linha.replace(/[^\p{L}]/gu, "");
  return (
    linha.length <= 120 &&
    letras.length >= 3 &&
    letras === letras.toLocaleUpperCase("pt-BR")
  );
}
