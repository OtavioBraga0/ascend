import { describe, expect, it } from "vitest";

import { concursoSchema } from "@/lib/validacao/concurso";

const base = {
  nome: "Escrevente — MP",
  banca: "",
  cargo: "",
  dataProva: "",
  cor: "blue",
};

describe("concursoSchema", () => {
  it("normaliza campos opcionais vazios para null", () => {
    expect(
      concursoSchema.parse({ ...base, nome: "  Escrevente — MP  " }),
    ).toEqual({
      nome: "Escrevente — MP",
      banca: null,
      cargo: null,
      dataProva: null,
      cor: "blue",
    });
  });

  it("converte a data da prova", () => {
    const { dataProva } = concursoSchema.parse({
      ...base,
      dataProva: "2027-03-14",
    });
    expect(dataProva?.toISOString()).toBe("2027-03-14T00:00:00.000Z");
  });

  it("rejeita nome vazio, data inválida e cor desconhecida", () => {
    const result = concursoSchema.safeParse({
      ...base,
      nome: "   ",
      dataProva: "2027-02-31",
      cor: "pink",
    });
    expect(result.success).toBe(false);
    const campos = result.error?.issues.map((issue) => issue.path[0]);
    expect(campos).toEqual(
      expect.arrayContaining(["nome", "dataProva", "cor"]),
    );
  });
});
