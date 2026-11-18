import "server-only";

import { dividirTexto, TAMANHO_PARTE } from "./dividir";
import {
  chamarOpenRouter,
  type ErroOpenRouter,
  type UsoOpenRouter,
} from "./openrouter";
import { montarMensagens } from "./prompt";
import type { RespostaEdital } from "./schema";

/**
 * Tempo total da extração, somando as novas tentativas. Fica abaixo do
 * `maxDuration` da página de importação (150 s), com folga para o banco.
 */
export const PRAZO_MS = 130_000;

/** Só tenta de novo uma parte se ainda sobrar pelo menos esse tempo. */
export const TEMPO_MINIMO_NOVA_TENTATIVA_MS = 30_000;

/**
 * Temperatura da nova tentativa. Com 0, o modelo que entrou em repetição
 * tende a repetir do mesmo jeito; um pouco de variação o tira do padrão.
 */
export const TEMPERATURA_NOVA_TENTATIVA = 0.3;

export type ResultadoExtracao =
  | {
      ok: true;
      resposta: RespostaEdital;
      /** Modelos que responderam (pode haver reservas, um por parte). */
      modelos: string[];
      uso: UsoOpenRouter | null;
      partes: number;
    }
  | {
      ok: false;
      erro: ErroOpenRouter;
      modelos: string[];
      uso: UsoOpenRouter | null;
      partes: number;
    };

/**
 * Erros que podem passar numa nova chamada: sobrecarga, falha do provedor,
 * resposta malformada ou cortada (o modelo às vezes entra em repetição).
 * Chave inválida, falta de créditos e pedido recusado não mudam.
 */
export function valeTentarDeNovo(erro: ErroOpenRouter) {
  if (erro === "sem_chave" || erro === "timeout") return false;
  const status = /^http_(\d+)$/.exec(erro)?.[1];
  if (status) return status === "429" || Number(status) >= 500;
  return true;
}

/**
 * Extrai o edital em partes, em paralelo. O resultado só sai se todas as
 * partes derem certo: uma estrutura com pedaços faltando nunca chega à revisão.
 * Quando uma parte falha de vez, as outras são canceladas.
 */
export async function extrairEdital(
  texto: string,
  { tamanhoParte = TAMANHO_PARTE }: { tamanhoParte?: number } = {},
): Promise<ResultadoExtracao> {
  const partes = dividirTexto(texto, tamanhoParte);
  const prazo = Date.now() + PRAZO_MS;
  const cancelar = new AbortController();
  const usos: UsoOpenRouter[] = [];
  const modelos = new Set<string>();
  let erro: ErroOpenRouter | null = null;

  async function extrairParte(
    parte: (typeof partes)[number],
    indice: number,
  ): Promise<RespostaEdital | null> {
    const mensagens = montarMensagens(parte.texto, {
      numero: indice + 1,
      total: partes.length,
      anterior: parte.anterior,
    });
    for (let tentativa = 1; ; tentativa++) {
      const restante = Math.max(1, prazo - Date.now());
      const chamada = await chamarOpenRouter({
        mensagens,
        temperatura: tentativa === 1 ? 0 : TEMPERATURA_NOVA_TENTATIVA,
        signal: AbortSignal.any([
          cancelar.signal,
          AbortSignal.timeout(restante),
        ]),
      });
      if (chamada.uso) usos.push(chamada.uso);
      if (chamada.modelo) modelos.add(chamada.modelo);
      if (chamada.ok) return chamada.resposta;
      // Cancelada porque outra parte falhou: o erro que vale é o dela.
      if (cancelar.signal.aborted) return null;
      const temTempo = prazo - Date.now() >= TEMPO_MINIMO_NOVA_TENTATIVA_MS;
      if (tentativa === 1 && temTempo && valeTentarDeNovo(chamada.erro))
        continue;
      erro ??= chamada.erro;
      cancelar.abort();
      return null;
    }
  }

  const respostas = await Promise.all(partes.map(extrairParte));
  const base = {
    modelos: [...modelos],
    uso: somarUso(usos),
    partes: partes.length,
  };
  if (erro) return { ok: false, erro, ...base };

  const completas = respostas.filter((r): r is RespostaEdital => r !== null);
  return {
    ok: true,
    resposta: {
      // Uma matéria cortada entre duas partes aparece nas duas; o
      // pós-processamento junta as de mesmo nome.
      materias: completas.flatMap((r) => r.materias),
      avisos: [...new Set(completas.flatMap((r) => r.avisos))],
    },
    ...base,
  };
}

function somarUso(usos: UsoOpenRouter[]): UsoOpenRouter | null {
  if (usos.length === 0) return null;
  const somar = (campo: keyof UsoOpenRouter) => {
    const valores = usos
      .map((uso) => uso[campo])
      .filter((v): v is number => v !== null);
    return valores.length > 0 ? valores.reduce((a, b) => a + b, 0) : null;
  };
  return {
    tokensEntrada: somar("tokensEntrada"),
    tokensSaida: somar("tokensSaida"),
    custoUsd: somar("custoUsd"),
  };
}
