import { beforeEach, describe, expect, it, vi } from "vitest";

import { extrairEdital, valeTentarDeNovo } from "./extrair";
import { chamarOpenRouter, type ResultadoOpenRouter } from "./openrouter";

vi.mock("./openrouter", () => ({ chamarOpenRouter: vi.fn() }));
const chamar = vi.mocked(chamarOpenRouter);

const uso = { tokensEntrada: 100, tokensSaida: 50, custoUsd: 0.001 };
const ok = (nome: string, topicos: string[], avisos: string[] = []) =>
  ({
    ok: true,
    resposta: { materias: [{ nome, topicos }], avisos },
    modelo: "modelo/a",
    uso,
  }) satisfies ResultadoOpenRouter;
const falha = (erro: string) =>
  ({ ok: false, erro, modelo: null, uso: null }) as ResultadoOpenRouter;

// Três partes de ~40 caracteres, cortadas antes de cada matéria.
const TEXTO =
  "DIREITO PENAL\n1. Crimes contra a pessoa.\nDIREITO CIVIL\n1. Contratos em geral.\nDIREITO PROCESSUAL\n1. Prova.";

/** Texto entre `<edital>` e `</edital>` (sem o contexto). */
const trecho = (conteudo: string) =>
  conteudo.match(/<edital>\n([\s\S]*)\n<\/edital>/)![1];
const trechoDa = (n: number) =>
  trecho(chamar.mock.calls[n][0].mensagens[1].content);

beforeEach(() => {
  chamar.mockReset();
});

describe("valeTentarDeNovo", () => {
  it.each([
    ["http_429", true],
    ["http_500", true],
    ["http_503", true],
    ["rede", true],
    ["json_invalido", true],
    ["schema_invalido", true],
    ["resposta_truncada", true],
    ["vazio", true],
    ["http_400", false],
    ["http_401", false],
    ["http_402", false],
    ["timeout", false],
    ["sem_chave", false],
  ] as const)("%s → %s", (erro, esperado) => {
    expect(valeTentarDeNovo(erro)).toBe(esperado);
  });
});

describe("extrairEdital", () => {
  it("texto pequeno vai numa chamada só, sem falar em trechos", async () => {
    chamar.mockResolvedValueOnce(ok("DIREITO PENAL", ["Crimes"]));
    const r = await extrairEdital(TEXTO);
    expect(r.ok && r.partes).toBe(1);
    expect(chamar.mock.calls[0][0].mensagens[1].content).not.toMatch(/trecho/);
  });

  it("junta as partes em ordem, soma o uso e tira avisos repetidos", async () => {
    chamar.mockImplementation(async ({ mensagens }) => {
      const conteudo = trecho(mensagens[1].content);
      if (conteudo.includes("Crimes"))
        return ok("DIREITO PENAL", ["Crimes"], ["Aviso"]);
      if (conteudo.includes("Contratos"))
        return ok("DIREITO CIVIL", ["Contratos"], ["Aviso"]);
      return ok("DIREITO PROCESSUAL", ["Prova"]);
    });
    const r = await extrairEdital(TEXTO, { tamanhoParte: 45 });
    expect(r).toEqual({
      ok: true,
      partes: 3,
      modelos: ["modelo/a"],
      uso: { tokensEntrada: 300, tokensSaida: 150, custoUsd: 0.003 },
      resposta: {
        materias: [
          { nome: "DIREITO PENAL", topicos: ["Crimes"] },
          { nome: "DIREITO CIVIL", topicos: ["Contratos"] },
          { nome: "DIREITO PROCESSUAL", topicos: ["Prova"] },
        ],
        avisos: ["Aviso"],
      },
    });
    expect([0, 1, 2].map(trechoDa).join("")).toBe(TEXTO);
    expect(chamar.mock.calls[1][0].mensagens[1].content).toMatch(
      /trecho 2 de 3[\s\S]*<contexto>\n[\s\S]*Crimes contra a pessoa\.\n\n<\/contexto>/,
    );
  });

  it("tenta de novo uma parte que falhou, com um pouco de temperatura", async () => {
    chamar
      .mockResolvedValueOnce(falha("resposta_truncada"))
      .mockResolvedValueOnce(ok("DIREITO PENAL", ["Crimes"]));
    const r = await extrairEdital(TEXTO);
    expect(r.ok).toBe(true);
    expect(chamar.mock.calls.map(([args]) => args.temperatura)).toEqual([
      0, 0.3,
    ]);
  });

  it("não devolve estrutura incompleta: uma parte falhando derruba tudo", async () => {
    chamar.mockImplementation(async ({ mensagens, signal }) => {
      if (trecho(mensagens[1].content).includes("Contratos"))
        return falha("http_402");
      // As outras partes esperam até serem canceladas.
      await new Promise((resolve) =>
        signal!.addEventListener("abort", resolve),
      );
      return falha("timeout");
    });
    const r = await extrairEdital(TEXTO, { tamanhoParte: 45 });
    expect(r).toMatchObject({ ok: false, erro: "http_402", partes: 3 });
    // Falta de créditos não muda numa nova chamada.
    expect(chamar).toHaveBeenCalledTimes(3);
  });

  it("tenta só uma vez de novo", async () => {
    chamar.mockResolvedValue(falha("resposta_truncada"));
    const r = await extrairEdital(TEXTO);
    expect(r).toMatchObject({ ok: false, erro: "resposta_truncada" });
    expect(chamar).toHaveBeenCalledTimes(2);
  });
});
