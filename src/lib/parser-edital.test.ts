import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { parseEdital, SEM_MATERIA } from "@/lib/parser-edital";

const fixture = (nome: string) =>
  readFileSync(new URL(`./__fixtures__/${nome}`, import.meta.url), "utf8");

describe("parseEdital — fixtures", () => {
  it("matérias em caixa alta com tópicos numerados e marcadores", () => {
    expect(parseEdital(fixture("caixa-alta-numerado.txt"))).toEqual([
      {
        nome: "LÍNGUA PORTUGUESA",
        topicos: [
          "Leitura e interpretação de textos",
          "Ortografia oficial",
          "Acentuação gráfica",
          "Classes de palavras",
          "Substantivo e adjetivo",
          "Verbo: flexão e emprego",
          "Concordância verbal e nominal",
        ],
      },
      {
        nome: "NOÇÕES DE DIREITO PENAL",
        topicos: [
          "Infração penal: elementos e espécies",
          "Sujeito ativo e sujeito passivo da infração penal",
          "Crimes contra a administração pública (arts. 312 a 359 do Código Penal)",
        ],
      },
      {
        nome: "NOÇÕES DE INFORMÁTICA",
        topicos: [
          "MS-Windows 10: conceito de pastas, diretórios e arquivos",
          "MS-Word 2016: estrutura básica dos documentos",
          "Correio eletrônico: uso de correio eletrônico",
        ],
      },
    ]);
  });

  it("texto corrido separado por ponto e vírgula", () => {
    expect(parseEdital(fixture("texto-corrido-ponto-e-virgula.txt"))).toEqual([
      {
        nome: "Matemática",
        topicos: [
          "Números inteiros, racionais e reais",
          "Sistema legal de medidas",
          "Razões e proporções",
          "Regra de três simples e composta",
          "Porcentagem",
          "Juros simples",
        ],
      },
      {
        nome: "Raciocínio Lógico",
        topicos: [
          "Estruturas lógicas",
          "Lógica de argumentação: analogias, inferências, deduções e conclusões",
          "Diagramas lógicos",
        ],
      },
      {
        nome: "Legislação",
        topicos: [
          "Lei Complementar Estadual nº 734/1993 (Lei Orgânica do Ministério Público de São Paulo)",
          "Lei nº 10.261/1968 (Estatuto dos Funcionários Públicos Civis do Estado de São Paulo) – artigos 239 a 323",
        ],
      },
    ]);
  });

  it("texto de PDF com hifenização, quebras de linha e números de página", () => {
    expect(parseEdital(fixture("pdf-baguncado.txt"))).toEqual([
      {
        nome: "LÍNGUA PORTUGUESA",
        topicos: [
          "Leitura e interpretação de diversos tipos de textos (literários e não literários)",
          "Sinônimos e antônimos",
          "Sentido próprio e figurado das palavras",
          "Pontuação",
          "Classes de palavras: substantivo, adjetivo, numeral, artigo, pronome, verbo, advérbio, preposição e conjunção: emprego e sentido que imprimem às relações que estabelecem",
          "Concordância verbal e nominal",
          "Regência verbal e nominal",
          "Colocação pronominal",
          "Crase",
        ],
      },
      {
        nome: "NOÇÕES DE DIREITO ADMINISTRATIVO E LEGISLAÇÃO ESPECÍFICA",
        topicos: [
          "Princípios básicos da Administração Pública previstos no art. 37 da Constituição Federal",
          "Atos administrativos: conceito, requisitos e atributos",
          "Lei nº 8.429/1992 (Improbidade Administrativa)",
        ],
      },
    ]);
  });

  it("formato Cebraspe com numeração na mesma linha da matéria", () => {
    expect(parseEdital(fixture("cebraspe-inline.txt"))).toEqual([
      {
        nome: "LÍNGUA PORTUGUESA",
        topicos: [
          "Compreensão e interpretação de textos de gêneros variados",
          "Reconhecimento de tipos e gêneros textuais",
          "Domínio da ortografia oficial",
          "Domínio dos mecanismos de coesão textual",
          "Emprego de elementos de referenciação, substituição e repetição, de conectores e de outros elementos de sequenciação textual",
          "Emprego de tempos e modos verbais",
        ],
      },
      {
        nome: "NOÇÕES DE DIREITO CONSTITUCIONAL",
        topicos: [
          "Constituição da República Federativa do Brasil de 1988",
          "Direitos e garantias fundamentais (art. 5 da CF)",
          "Organização do Estado",
        ],
      },
    ]);
  });
});

describe("parseEdital — regras", () => {
  it("texto vazio não gera matérias", () => {
    expect(parseEdital("")).toEqual([]);
    expect(parseEdital(" \n\n ")).toEqual([]);
  });

  it("tópicos antes de qualquer matéria vão para 'Sem matéria'", () => {
    expect(parseEdital("Crase; Pontuação\nMATEMÁTICA\nPorcentagem")).toEqual([
      { nome: SEM_MATERIA, topicos: ["Crase", "Pontuação"] },
      { nome: "MATEMÁTICA", topicos: ["Porcentagem"] },
    ]);
  });

  it("matéria terminada em dois-pontos em linha própria", () => {
    expect(
      parseEdital("Conhecimentos sobre o órgão:\n- Estrutura\n- Competências"),
    ).toEqual([
      {
        nome: "Conhecimentos sobre o órgão",
        topicos: ["Estrutura", "Competências"],
      },
    ]);
  });

  it("separa por ponto seguido de número sem quebrar artigos de lei", () => {
    expect(
      parseEdital(
        "DIREITO CIVIL\n1. Pessoas naturais. 2. Bens (art. 79 do CC). 3. Fatos jurídicos.",
      ),
    ).toEqual([
      {
        nome: "DIREITO CIVIL",
        topicos: [
          "Pessoas naturais",
          "Bens (art. 79 do CC)",
          "Fatos jurídicos",
        ],
      },
    ]);
  });

  it("itens com letras e algarismos romanos", () => {
    expect(
      parseEdital(
        "ÉTICA\na) Princípios; b) deveres\nI - Vedações\nII – Penalidades",
      ),
    ).toEqual([
      {
        nome: "ÉTICA",
        topicos: ["Princípios", "deveres", "Vedações", "Penalidades"],
      },
    ]);
  });

  it("com o texto todo em caixa alta, só matérias conhecidas viram matéria", () => {
    const texto = "LÍNGUA PORTUGUESA\nCRASE\nPONTUAÇÃO\nREGÊNCIA";
    expect(parseEdital(texto)).toEqual([
      {
        nome: "LÍNGUA PORTUGUESA",
        topicos: ["CRASE", "PONTUAÇÃO", "REGÊNCIA"],
      },
    ]);
  });

  it("matéria conhecida em caixa mista, mas não tópico parecido", () => {
    expect(
      parseEdital("Noções de Direito Penal\nDireito de punir do Estado"),
    ).toEqual([
      {
        nome: "Noções de Direito Penal",
        topicos: ["Direito de punir do Estado"],
      },
    ]);
  });
});
