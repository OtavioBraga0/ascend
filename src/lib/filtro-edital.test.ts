import { describe, expect, it } from "vitest";

import { filtrarEdital, normalizarBusca } from "@/lib/filtro-edital";

const materias = [
  {
    nome: "Língua Portuguesa",
    topicos: [
      { titulo: "Crase", status: "REVISADO" as const },
      { titulo: "Acentuação gráfica", status: "TEORIA" as const },
    ],
  },
  {
    nome: "Direito Penal",
    topicos: [
      { titulo: "Infração penal", status: "NAO_INICIADO" as const },
      { titulo: "Ação penal", status: "REVISADO" as const },
    ],
  },
];

const nomes = (resultado: typeof materias) =>
  resultado.map(
    (m) => `${m.nome}: ${m.topicos.map((t) => t.titulo).join(", ")}`,
  );

describe("normalizarBusca", () => {
  it("ignora acentos, caixa e espaços extras", () => {
    expect(normalizarBusca("  AÇÃO   Penal ")).toBe("acao penal");
  });
});

describe("filtrarEdital", () => {
  it("sem filtro devolve tudo", () => {
    expect(filtrarEdital(materias, { busca: " ", status: null })).toBe(
      materias,
    );
  });

  it("busca no título sem acento", () => {
    expect(
      nomes(filtrarEdital(materias, { busca: "acentuacao", status: null })),
    ).toEqual(["Língua Portuguesa: Acentuação gráfica"]);
  });

  it("busca pelo nome da matéria traz todos os tópicos dela", () => {
    expect(
      nomes(filtrarEdital(materias, { busca: "penal", status: null })),
    ).toEqual(["Direito Penal: Infração penal, Ação penal"]);
  });

  it("filtra por status e combina com a busca", () => {
    expect(
      nomes(filtrarEdital(materias, { busca: "", status: "REVISADO" })),
    ).toEqual(["Língua Portuguesa: Crase", "Direito Penal: Ação penal"]);
    expect(
      nomes(filtrarEdital(materias, { busca: "crase", status: "TEORIA" })),
    ).toEqual([]);
  });
});
