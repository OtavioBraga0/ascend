import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  chamarOpenRouter,
  iaDisponivel,
  MAX_TOKENS,
  OPENROUTER_URL,
} from "./openrouter";
import { montarMensagens } from "./prompt";
import { EDITAL_JSON_SCHEMA } from "./schema";

const mensagens = montarMensagens("LÍNGUA PORTUGUESA\n1. Crase.");
const respostaValida = {
  materias: [{ nome: "LÍNGUA PORTUGUESA", topicos: ["Crase"] }],
  avisos: [],
};

function respostaApi(
  conteudo: unknown,
  extra: { finish_reason?: string; model?: string; usage?: object } = {},
) {
  return new Response(
    JSON.stringify({
      model: extra.model ?? "google/gemini-2.5-flash",
      choices: [
        {
          finish_reason: extra.finish_reason ?? "stop",
          message: {
            content:
              typeof conteudo === "string"
                ? conteudo
                : JSON.stringify(conteudo),
          },
        },
      ],
      usage: extra.usage ?? {
        prompt_tokens: 1200,
        completion_tokens: 300,
        cost: 0.00042,
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubEnv("OPENROUTER_API_KEY", "sk-teste");
  vi.stubEnv("OPENROUTER_MODEL", "google/gemini-2.5-flash");
  vi.stubEnv("OPENROUTER_FALLBACK_MODELS", "");
  vi.stubEnv("OPENROUTER_REASONING_EFFORT", "");
  vi.stubEnv("AUTH_URL", "https://ascend.exemplo.com");
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  fetchMock.mockReset();
});

function requisicao() {
  const [url, init] = fetchMock.mock.calls[0];
  return {
    url,
    init: init!,
    corpo: JSON.parse(String(init!.body)),
    cabecalhos: init!.headers as Record<string, string>,
  };
}

describe("configuração", () => {
  it("sem chave, a feature fica desligada e não chama a API", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    expect(iaDisponivel()).toBe(false);
    expect(await chamarOpenRouter({ mensagens })).toMatchObject({
      ok: false,
      erro: "sem_chave",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("com chave e modelo, a feature fica ligada", () => {
    expect(iaDisponivel()).toBe(true);
  });
});

describe("requisição", () => {
  it("manda o corpo com saída estruturada estrita", async () => {
    fetchMock.mockResolvedValue(respostaApi(respostaValida));
    await chamarOpenRouter({ mensagens });

    const { url, init, corpo } = requisicao();
    expect(url).toBe(OPENROUTER_URL);
    expect(init.method).toBe("POST");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(corpo).toEqual({
      model: "google/gemini-2.5-flash",
      messages: mensagens,
      temperature: 0,
      max_tokens: MAX_TOKENS,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "edital",
          strict: true,
          schema: EDITAL_JSON_SCHEMA,
        },
      },
      provider: { require_parameters: true },
      plugins: [{ id: "response-healing" }],
    });
  });

  it("manda o esforço de raciocínio só quando configurado", async () => {
    fetchMock.mockResolvedValue(respostaApi(respostaValida));
    vi.stubEnv("OPENROUTER_REASONING_EFFORT", " None ");
    await chamarOpenRouter({ mensagens });
    expect(requisicao().corpo.reasoning).toEqual({ effort: "none" });

    fetchMock.mockClear();
    fetchMock.mockResolvedValue(respostaApi(respostaValida));
    vi.stubEnv("OPENROUTER_REASONING_EFFORT", "turbo");
    await chamarOpenRouter({ mensagens });
    expect(requisicao().corpo).not.toHaveProperty("reasoning");
  });

  it("só manda `models` quando há modelos reserva", async () => {
    vi.stubEnv(
      "OPENROUTER_FALLBACK_MODELS",
      " openai/gpt-4.1-mini, ,anthropic/claude-haiku-5-5 ",
    );
    fetchMock.mockResolvedValue(respostaApi(respostaValida));
    await chamarOpenRouter({ mensagens });
    expect(requisicao().corpo.models).toEqual([
      "google/gemini-2.5-flash",
      "openai/gpt-4.1-mini",
      "anthropic/claude-haiku-5-5",
    ]);
  });

  it("manda os cabeçalhos de autenticação e de identificação do app", async () => {
    fetchMock.mockResolvedValue(respostaApi(respostaValida));
    await chamarOpenRouter({ mensagens });
    expect(requisicao().cabecalhos).toEqual({
      Authorization: "Bearer sk-teste",
      "HTTP-Referer": "https://ascend.exemplo.com",
      "X-Title": "Ascend",
      "Content-Type": "application/json",
    });
  });
});

describe("resposta", () => {
  it("devolve a resposta validada, o modelo que respondeu e o uso", async () => {
    fetchMock.mockResolvedValue(
      respostaApi(respostaValida, { model: "openai/gpt-4.1-mini" }),
    );
    expect(await chamarOpenRouter({ mensagens })).toEqual({
      ok: true,
      resposta: respostaValida,
      modelo: "openai/gpt-4.1-mini",
      uso: { tokensEntrada: 1200, tokensSaida: 300, custoUsd: 0.00042 },
    });
  });

  it("sem custo no `usage`, o custo fica nulo", async () => {
    fetchMock.mockResolvedValue(
      respostaApi(respostaValida, {
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      }),
    );
    const resultado = await chamarOpenRouter({ mensagens });
    expect(resultado.ok && resultado.uso).toEqual({
      tokensEntrada: 10,
      tokensSaida: 5,
      custoUsd: null,
    });
  });

  it("guarda o uso mesmo quando a resposta não serve", async () => {
    fetchMock.mockResolvedValue(respostaApi("{ quebrado"));
    expect(await chamarOpenRouter({ mensagens })).toMatchObject({
      ok: false,
      erro: "json_invalido",
      uso: { tokensEntrada: 1200, tokensSaida: 300, custoUsd: 0.00042 },
    });
  });
});

describe("erros", () => {
  it.each([
    ["timeout", new DOMException("tempo esgotado", "TimeoutError")],
    ["timeout", new DOMException("cancelado", "AbortError")],
    ["rede", new TypeError("fetch failed")],
  ])("%s quando o fetch falha", async (erro, falha) => {
    fetchMock.mockRejectedValue(falha);
    expect(await chamarOpenRouter({ mensagens })).toMatchObject({
      ok: false,
      erro,
    });
  });

  it.each([401, 429, 500])("http_%i", async (status) => {
    fetchMock.mockResolvedValue(new Response("erro", { status }));
    expect(await chamarOpenRouter({ mensagens })).toMatchObject({
      ok: false,
      erro: `http_${status}`,
    });
  });

  it("json_invalido quando o corpo da API não é JSON", async () => {
    fetchMock.mockResolvedValue(new Response("<html>", { status: 200 }));
    expect(await chamarOpenRouter({ mensagens })).toMatchObject({
      erro: "json_invalido",
    });
  });

  it("json_invalido quando o conteúdo não é JSON", async () => {
    fetchMock.mockResolvedValue(respostaApi("Aqui está: {"));
    expect(await chamarOpenRouter({ mensagens })).toMatchObject({
      erro: "json_invalido",
    });
  });

  it("schema_invalido quando o JSON não segue o schema", async () => {
    fetchMock.mockResolvedValue(
      respostaApi({ materias: [{ nome: "", topicos: [] }], avisos: [] }),
    );
    expect(await chamarOpenRouter({ mensagens })).toMatchObject({
      erro: "schema_invalido",
    });
  });

  it("resposta_truncada quando finish_reason é length", async () => {
    fetchMock.mockResolvedValue(
      respostaApi(respostaValida, { finish_reason: "length" }),
    );
    expect(await chamarOpenRouter({ mensagens })).toMatchObject({
      erro: "resposta_truncada",
    });
  });

  it("vazio sem conteúdo ou sem choices", async () => {
    fetchMock.mockResolvedValueOnce(respostaApi(""));
    expect(await chamarOpenRouter({ mensagens })).toMatchObject({
      erro: "vazio",
    });
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ choices: [] }), { status: 200 }),
    );
    expect(await chamarOpenRouter({ mensagens })).toMatchObject({
      erro: "vazio",
    });
  });

  it("não registra o texto do edital nem a chave no log", async () => {
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    fetchMock.mockResolvedValue(new Response("erro", { status: 500 }));
    await chamarOpenRouter({ mensagens });
    const log = JSON.stringify(aviso.mock.calls);
    expect(log).toContain("http_500");
    expect(log).not.toContain("sk-teste");
    expect(log).not.toContain("Crase");
  });
});
