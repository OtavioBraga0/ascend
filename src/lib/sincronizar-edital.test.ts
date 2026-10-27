import { describe, expect, it } from "vitest";

import { planejarEdital } from "@/lib/sincronizar-edital";

const existentes = {
  materias: [
    { id: "mPort", nome: "Língua Portuguesa" },
    { id: "mMat", nome: "Matemática" },
  ],
  topicos: [
    { id: "tCrase", titulo: "Crase" },
    { id: "tPont", titulo: "Pontuação" },
    { id: "tPorc", titulo: "Porcentagem" },
  ],
};

describe("planejarEdital", () => {
  it("edição: mantém ids, move tópico entre matérias e exclui o que saiu", () => {
    const plano = planejarEdital(existentes, [
      {
        id: "mPort",
        nome: "Português",
        peso: 3,
        topicos: [
          { id: "tPorc", titulo: "Porcentagem" },
          { id: "tCrase", titulo: "Crase" },
          { id: "uuid-novo", titulo: "Regência" },
        ],
      },
    ]);
    expect(plano.materias).toEqual([
      {
        existenteId: "mPort",
        nome: "Português",
        peso: 3,
        ordem: 0,
        topicos: [
          { existenteId: "tPorc", titulo: "Porcentagem", ordem: 0 },
          { existenteId: "tCrase", titulo: "Crase", ordem: 1 },
          { existenteId: undefined, titulo: "Regência", ordem: 2 },
        ],
      },
    ]);
    expect(plano.excluirMaterias).toEqual(["mMat"]);
    expect(plano.excluirTopicos).toEqual(["tPont"]);
  });

  it("reimportação: reaproveita por nome e título normalizados", () => {
    const plano = planejarEdital(existentes, [
      {
        nome: "LÍNGUA PORTUGUESA",
        peso: 1,
        topicos: [{ titulo: "CRASE" }, { titulo: "Ortografia" }],
      },
      {
        nome: "Raciocínio Lógico",
        peso: 1,
        topicos: [{ titulo: "porcentagem" }],
      },
    ]);
    expect(plano.materias.map((m) => m.existenteId)).toEqual([
      "mPort",
      undefined,
    ]);
    expect(plano.materias[0].topicos.map((t) => t.existenteId)).toEqual([
      "tCrase",
      undefined,
    ]);
    expect(plano.materias[1].topicos[0].existenteId).toBe("tPorc");
    expect(plano.excluirMaterias).toEqual(["mMat"]);
    expect(plano.excluirTopicos).toEqual(["tPont"]);
  });

  it("um id explícito tem precedência sobre o título", () => {
    const plano = planejarEdital(existentes, [
      {
        id: "mPort",
        nome: "Língua Portuguesa",
        peso: 1,
        // O primeiro "Crase" é novo; o segundo mantém o id. O novo não pode herdar tCrase.
        topicos: [
          { titulo: "Crase" },
          { id: "tCrase", titulo: "Crase (revisar)" },
        ],
      },
    ]);
    expect(plano.materias[0].topicos.map((t) => t.existenteId)).toEqual([
      undefined,
      "tCrase",
    ]);
  });

  it("ignora ids que não são deste concurso e não reaproveita o mesmo item duas vezes", () => {
    const plano = planejarEdital(existentes, [
      {
        id: "materia-de-outro-usuario",
        nome: "Nova",
        peso: 1,
        topicos: [
          { id: "topico-de-outro-usuario", titulo: "X" },
          { titulo: "Crase" },
          { titulo: "Crase" },
        ],
      },
    ]);
    expect(plano.materias[0].existenteId).toBeUndefined();
    expect(plano.materias[0].topicos.map((t) => t.existenteId)).toEqual([
      undefined,
      "tCrase",
      undefined,
    ]);
  });
});
