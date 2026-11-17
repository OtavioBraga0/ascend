import "server-only";

import type { Mensagem } from "./prompt";
import {
  EDITAL_JSON_SCHEMA,
  respostaEditalSchema,
  type RespostaEdital,
} from "./schema";

export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
export const TIMEOUT_MS = 60_000;
export const MAX_TOKENS = 16_000;

export type ErroOpenRouter =
  | "sem_chave"
  | "timeout"
  | "rede"
  | `http_${number}`
  | "json_invalido"
  | "schema_invalido"
  | "resposta_truncada"
  | "vazio";

export type UsoOpenRouter = {
  tokensEntrada: number | null;
  tokensSaida: number | null;
  custoUsd: number | null;
};

export type ResultadoOpenRouter =
  | {
      ok: true;
      resposta: RespostaEdital;
      /** O modelo que respondeu de fato (pode ser um dos reservas). */
      modelo: string;
      uso: UsoOpenRouter;
    }
  | {
      ok: false;
      erro: ErroOpenRouter;
      modelo: string | null;
      uso: UsoOpenRouter | null;
    };

type Config = {
  chave: string;
  modelo: string;
  reservas: string[];
  urlApp: string;
};

/** Lê a configuração na hora da chamada; `null` se a feature estiver desligada. */
export function lerConfig(): Config | null {
  const chave = process.env.OPENROUTER_API_KEY?.trim();
  const modelo = process.env.OPENROUTER_MODEL?.trim();
  if (!chave || !modelo) return null;
  const reservas = (process.env.OPENROUTER_FALLBACK_MODELS ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter((m) => m && m !== modelo);
  return { chave, modelo, reservas, urlApp: urlDoApp() };
}

export function iaDisponivel() {
  return lerConfig() !== null;
}

function urlDoApp() {
  if (process.env.AUTH_URL) return process.env.AUTH_URL;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return vercel ? `https://${vercel}` : "http://localhost:3000";
}

export function montarCorpo(mensagens: Mensagem[], config: Config) {
  return {
    model: config.modelo,
    ...(config.reservas.length > 0 && {
      models: [config.modelo, ...config.reservas],
    }),
    messages: mensagens,
    temperature: 0,
    max_tokens: MAX_TOKENS,
    response_format: {
      type: "json_schema",
      json_schema: { name: "edital", strict: true, schema: EDITAL_JSON_SCHEMA },
    },
    // Só roteia para provedores que suportam `response_format`.
    provider: { require_parameters: true },
    // Corrige JSON levemente malformado.
    plugins: [{ id: "response-healing" }],
  };
}

type RespostaApi = {
  model?: unknown;
  choices?: { finish_reason?: unknown; message?: { content?: unknown } }[];
  usage?: {
    prompt_tokens?: unknown;
    completion_tokens?: unknown;
    cost?: unknown;
  };
};

const numero = (valor: unknown) =>
  typeof valor === "number" && Number.isFinite(valor) ? valor : null;

function lerUso(corpo: RespostaApi): UsoOpenRouter | null {
  if (!corpo.usage) return null;
  return {
    tokensEntrada: numero(corpo.usage.prompt_tokens),
    tokensSaida: numero(corpo.usage.completion_tokens),
    custoUsd: numero(corpo.usage.cost),
  };
}

/**
 * Chama o OpenRouter com saída estruturada. Nunca lança: qualquer falha vira
 * um `erro` tipado. Não registra o texto do edital nem a chave.
 */
export async function chamarOpenRouter({
  mensagens,
  signal,
}: {
  mensagens: Mensagem[];
  signal?: AbortSignal;
}): Promise<ResultadoOpenRouter> {
  const config = lerConfig();
  if (!config) return { ok: false, erro: "sem_chave", modelo: null, uso: null };

  const tamanho = mensagens.reduce((total, m) => total + m.content.length, 0);
  const falha = (
    erro: ErroOpenRouter,
    extra: {
      status?: number;
      modelo?: string | null;
      uso?: UsoOpenRouter | null;
    } = {},
  ): ResultadoOpenRouter => {
    console.warn("[extracao-ia] falha", {
      erro,
      status: extra.status,
      modelo: extra.modelo ?? config.modelo,
      caracteres: tamanho,
    });
    return {
      ok: false,
      erro,
      modelo: extra.modelo ?? null,
      uso: extra.uso ?? null,
    };
  };

  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  let resposta: Response;
  let corpo: RespostaApi;
  try {
    resposta = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.chave}`,
        "HTTP-Referer": config.urlApp,
        "X-Title": "Ascend",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(montarCorpo(mensagens, config)),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (!resposta.ok) {
      return falha(`http_${resposta.status}`, { status: resposta.status });
    }
    corpo = (await resposta.json()) as RespostaApi;
  } catch (erro) {
    const nome = erro instanceof Error ? erro.name : "";
    if (nome === "TimeoutError" || nome === "AbortError")
      return falha("timeout");
    // `resposta.json()` falhou: o corpo não é JSON.
    if (erro instanceof SyntaxError) return falha("json_invalido");
    return falha("rede");
  }

  const modelo = typeof corpo.model === "string" ? corpo.model : config.modelo;
  const uso = lerUso(corpo);
  const escolha = corpo.choices?.[0];
  const extra = { modelo, uso, status: resposta.status };

  if (escolha?.finish_reason === "length")
    return falha("resposta_truncada", extra);
  const conteudo = escolha?.message?.content;
  if (typeof conteudo !== "string" || !conteudo.trim())
    return falha("vazio", extra);

  let json: unknown;
  try {
    json = JSON.parse(conteudo);
  } catch {
    return falha("json_invalido", extra);
  }
  const validado = respostaEditalSchema.safeParse(json);
  if (!validado.success) return falha("schema_invalido", extra);

  return {
    ok: true,
    resposta: validado.data,
    modelo,
    uso: uso ?? { tokensEntrada: null, tokensSaida: null, custoUsd: null },
  };
}
