import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { parseEdital, type MateriaParseada } from "@/lib/parser-edital";
import { criarRevisao } from "@/lib/revisao-edital";
import { editalSchema } from "@/lib/validacao/edital";

import { posProcessar } from "./pos-processar";
import type { RespostaEdital } from "./schema";

const fixture = (nome: string) =>
  readFileSync(new URL(`../__fixtures__/${nome}`, import.meta.url), "utf8");

const resposta = (
  materias: RespostaEdital["materias"],
  avisos: string[] = [],
): RespostaEdital => ({ materias, avisos });

describe("posProcessar — limpeza", () => {
  const texto = "Crase. Pontuação. Regência. Porcentagem.";

  it("descarta tópicos e matérias vazios", () => {
    const { estrutura } = posProcessar(
      resposta([
        { nome: "Português", topicos: ["Crase", "", "  ", "1.", "Pontuação"] },
        { nome: "Matemática", topicos: ["", "-"] },
      ]),
      texto,
    );
    expect(estrutura).toEqual([
      { nome: "Português", topicos: ["Crase", "Pontuação"] },
    ]);
  });

  it("descarta duplicados com a regra do parser", () => {
    const { estrutura } = posProcessar(
      resposta([
        { nome: "Português", topicos: ["Crase", "1. Crase.", "Crase;"] },
      ]),
      texto,
    );
    expect(estrutura).toEqual([{ nome: "Português", topicos: ["Crase"] }]);
  });

  it("tira numeração, marcadores e pontuação que sobraram", () => {
    const { estrutura } = posProcessar(
      resposta([
        {
          nome: "PORTUGUÊS:",
          topicos: [
            "1.1 Crase.",
            "a) Pontuação;",
            "• Regência",
            "IV - Porcentagem",
          ],
        },
      ]),
      texto,
    );
    expect(estrutura).toEqual([
      {
        nome: "Português",
        topicos: ["Crase", "Pontuação", "Regência", "Porcentagem"],
      },
    ]);
  });

  it("normaliza espaços", () => {
    const { estrutura, avisos } = posProcessar(
      resposta(
        [
          {
            nome: "  Língua   Portuguesa ",
            topicos: ["  Crase \n e  pontuação "],
          },
        ],
        ["  aviso   com espaços ", "   "],
      ),
      "Crase e pontuação",
    );
    expect(estrutura).toEqual([
      { nome: "Língua Portuguesa", topicos: ["Crase e pontuação"] },
    ]);
    expect(avisos).toEqual(["aviso com espaços"]);
  });

  it("converte nomes em caixa alta como a leitura padrão", () => {
    const { estrutura } = posProcessar(
      resposta([
        { nome: "NOÇÕES DE DIREITO PENAL", topicos: ["Crase"] },
        { nome: "Raciocínio Lógico", topicos: ["Porcentagem"] },
      ]),
      texto,
    );
    expect(estrutura.map((m) => m.nome)).toEqual([
      "Noções de Direito Penal",
      "Raciocínio Lógico",
    ]);
  });

  it("junta matérias de mesmo nome, mantendo a ordem da primeira", () => {
    const { estrutura } = posProcessar(
      resposta([
        { nome: "Português", topicos: ["Crase"] },
        { nome: "Matemática", topicos: ["Porcentagem"] },
        { nome: "PORTUGUÊS ", topicos: ["Pontuação", "Crase"] },
      ]),
      texto,
    );
    expect(estrutura).toEqual([
      { nome: "Português", topicos: ["Crase", "Pontuação"] },
      { nome: "Matemática", topicos: ["Porcentagem"] },
    ]);
  });
});

describe("posProcessar — fidelidade", () => {
  const texto = fixture("pdf-baguncado.txt");
  const naoEncontrados = (topicos: string[]) =>
    posProcessar(resposta([{ nome: "LÍNGUA PORTUGUESA", topicos }]), texto)
      .topicosNaoEncontrados;

  it("aprova tópicos literais", () => {
    expect(
      naoEncontrados(["Sinônimos e antônimos", "Colocação pronominal"]),
    ).toEqual([]);
  });

  it("aprova tópicos quebrados em linhas e hifenizados no PDF", () => {
    expect(
      naoEncontrados([
        "Leitura e interpretação de diversos tipos de textos (literários e não literários)",
        "Sentido próprio e figurado das palavras",
        "Lei nº 8.429/1992 (Improbidade Administrativa)",
      ]),
    ).toEqual([]);
  });

  it("aprova diferenças de acento, caixa e pontuação", () => {
    expect(
      naoEncontrados([
        "SINONIMOS E ANTONIMOS",
        "regencia verbal, e nominal",
        "Principios basicos da administracao publica previstos no art 37 da Constituicao Federal",
      ]),
    ).toEqual([]);
  });

  it("aprova tópicos quase literais (80% das palavras próximas)", () => {
    expect(
      naoEncontrados([
        // Uma palavra a mais de 5 significativas.
        "Atos administrativos: conceito, requisitos, atributos e espécies",
      ]),
    ).toEqual([]);
  });

  it("reprova tópicos inventados e devolve sem removê-los", () => {
    const resultado = posProcessar(
      resposta([
        {
          nome: "LÍNGUA PORTUGUESA",
          topicos: [
            "Crase",
            "Figuras de linguagem",
            "Análise sintática do período composto",
          ],
        },
      ]),
      texto,
    );
    expect(resultado.estrutura[0].topicos).toHaveLength(3);
    expect(resultado.topicosNaoEncontrados).toEqual([
      { materia: "Língua Portuguesa", topico: "Figuras de linguagem" },
      {
        materia: "Língua Portuguesa",
        topico: "Análise sintática do período composto",
      },
    ]);
  });

  it("reprova palavras que existem no texto, mas longe umas das outras", () => {
    // "Leitura" (início) e "Crase" (fim do bloco) estão distantes.
    expect(naoEncontrados(["Leitura da crase"])).toEqual([
      { materia: "Língua Portuguesa", topico: "Leitura da crase" },
    ]);
  });
});

describe("posProcessar — paridade com o parser", () => {
  it("a saída serve para o mesmo código que consome o parser", () => {
    const texto = fixture("caixa-alta-numerado.txt");
    const doParser: MateriaParseada[] = parseEdital(texto);
    const daIa: MateriaParseada[] = posProcessar(
      resposta(doParser.map((m) => ({ nome: m.nome, topicos: m.topicos }))),
      texto,
    ).estrutura;

    expect(daIa).toEqual(doParser);
    const ids = () => {
      let n = 0;
      return () => String(++n);
    };
    const revisao = criarRevisao(daIa, ids());
    expect(revisao).toEqual(criarRevisao(doParser, ids()));
    expect(
      editalSchema.safeParse(
        revisao.map((m) => ({
          nome: m.nome,
          peso: m.peso,
          topicos: m.topicos,
        })),
      ).success,
    ).toBe(true);
  });
});
