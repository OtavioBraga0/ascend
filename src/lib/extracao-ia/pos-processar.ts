import { normalizarBusca } from "@/lib/filtro-edital";
import {
  limparNome,
  limparTopicos,
  normalizarTexto,
  type MateriaParseada,
} from "@/lib/parser-edital";

import type { RespostaEdital } from "./schema";

export type TopicoNaoEncontrado = { materia: string; topico: string };

export type ResultadoPosProcessado = {
  /** Mesmo formato que `parseEdital` devolve. */
  estrutura: MateriaParseada[];
  avisos: string[];
  /** Tópicos que não aparecem no texto colado (possível alucinação). */
  topicosNaoEncontrados: TopicoNaoEncontrado[];
};

/** Fração das palavras significativas do tópico que precisa estar no texto. */
export const FRACAO_MINIMA_PALAVRAS = 0.8;

/** Palavras curtas e conectores não contam na comparação aproximada. */
const PALAVRAS_VAZIAS = new Set([
  "aos",
  "as",
  "com",
  "como",
  "das",
  "dos",
  "entre",
  "nas",
  "nos",
  "para",
  "pela",
  "pelas",
  "pelo",
  "pelos",
  "por",
  "que",
  "sem",
  "sob",
  "sobre",
  "uma",
  "um",
]);

const espacos = (texto: string) => texto.replace(/\s+/g, " ").trim();

/**
 * Converte a resposta da IA para o formato do parser: limpa, descarta vazios e
 * duplicados (com as mesmas regras do parser), junta matérias de mesmo nome e
 * aponta os tópicos que não aparecem no texto original. Nada é removido por
 * não ter sido encontrado: a revisão mostra e o usuário decide.
 */
export function posProcessar(
  resposta: RespostaEdital,
  textoOriginal: string,
): ResultadoPosProcessado {
  const porNome = new Map<string, { nome: string; brutos: string[] }>();
  for (const materia of resposta.materias) {
    const nome = limparNome(espacos(materia.nome));
    if (!nome) continue;
    const chave = normalizarBusca(nome);
    const existente = porNome.get(chave);
    const brutos = materia.topicos.map(espacos);
    if (existente) existente.brutos.push(...brutos);
    else porNome.set(chave, { nome, brutos });
  }

  const estrutura = [...porNome.values()]
    .map(({ nome, brutos }) => ({ nome, topicos: limparTopicos(brutos) }))
    .filter((materia) => materia.topicos.length > 0);

  const texto = new TextoNormalizado(textoOriginal);
  const topicosNaoEncontrados = estrutura.flatMap((materia) =>
    materia.topicos
      .filter((topico) => !texto.contem(topico))
      .map((topico) => ({ materia: materia.nome, topico })),
  );

  return {
    estrutura,
    avisos: resposta.avisos.map(espacos).filter(Boolean),
    topicosNaoEncontrados,
  };
}

/** Sem acentos, caixa, pontuação nem espaços extras. */
export function normalizarParaComparar(texto: string): string {
  return normalizarBusca(texto)
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function palavrasSignificativas(normalizado: string) {
  return [
    ...new Set(
      normalizado
        .split(" ")
        .filter((p) => p.length >= 3 && !PALAVRAS_VAZIAS.has(p)),
    ),
  ];
}

/** Texto original pronto para a verificação de fidelidade. */
class TextoNormalizado {
  private readonly texto: string;
  private readonly posicoes = new Map<string, number[]>();

  constructor(original: string) {
    this.texto = normalizarParaComparar(normalizarTexto(original));
    this.texto.split(" ").forEach((palavra, i) => {
      const lista = this.posicoes.get(palavra);
      if (lista) lista.push(i);
      else this.posicoes.set(palavra, [i]);
    });
  }

  /**
   * O tópico aparece como trecho do texto ou, pelo menos, 80% das palavras
   * significativas dele aparecem perto umas das outras.
   */
  contem(topico: string): boolean {
    const alvo = normalizarParaComparar(topico);
    if (!alvo) return false;
    if (` ${this.texto} `.includes(` ${alvo} `)) return true;

    const palavras = palavrasSignificativas(alvo);
    if (palavras.length === 0) return false;
    const minimo = Math.ceil(palavras.length * FRACAO_MINIMA_PALAVRAS);
    // "Perto": todas dentro de uma janela de ~2× o tamanho do tópico.
    const janela = alvo.split(" ").length * 2 + 5;

    // Ocorrências das palavras do tópico, em ordem de posição no texto.
    const ocorrencias = palavras
      .flatMap((palavra, id) =>
        (this.posicoes.get(palavra) ?? []).map((pos) => ({ pos, id })),
      )
      .sort((a, b) => a.pos - b.pos);

    // Janela deslizante contando palavras distintas.
    const contagem = new Map<number, number>();
    let inicio = 0;
    for (const { pos, id } of ocorrencias) {
      contagem.set(id, (contagem.get(id) ?? 0) + 1);
      while (pos - ocorrencias[inicio].pos >= janela) {
        const saindo = ocorrencias[inicio++].id;
        const resta = contagem.get(saindo)! - 1;
        if (resta === 0) contagem.delete(saindo);
        else contagem.set(saindo, resta);
      }
      if (contagem.size >= minimo) return true;
    }
    return false;
  }
}
