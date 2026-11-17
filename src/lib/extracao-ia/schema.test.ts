import { describe, expect, it } from "vitest";

import { EDITAL_JSON_SCHEMA, respostaEditalSchema } from "./schema";

const valida = {
  materias: [
    {
      nome: "Língua Portuguesa",
      topicos: ["Compreensão e interpretação de textos", "Ortografia oficial"],
    },
  ],
  avisos: [],
};

describe("respostaEditalSchema", () => {
  it("aceita uma resposta válida", () => {
    expect(respostaEditalSchema.parse(valida)).toEqual(valida);
  });

  it("aceita matérias vazias com aviso", () => {
    const resposta = { materias: [], avisos: ["Sem conteúdo programático."] };
    expect(respostaEditalSchema.safeParse(resposta).success).toBe(true);
  });

  it("recusa campos extras", () => {
    expect(
      respostaEditalSchema.safeParse({ ...valida, extra: 1 }).success,
    ).toBe(false);
    expect(
      respostaEditalSchema.safeParse({
        ...valida,
        materias: [{ ...valida.materias[0], peso: 2 }],
      }).success,
    ).toBe(false);
  });

  it("recusa nome vazio ou só com espaços", () => {
    for (const nome of ["", "   "]) {
      expect(
        respostaEditalSchema.safeParse({
          ...valida,
          materias: [{ nome, topicos: [] }],
        }).success,
      ).toBe(false);
    }
  });

  it("recusa tipos errados e campos faltando", () => {
    const invalidas = [
      { materias: "Português", avisos: [] },
      { materias: [{ nome: 1, topicos: [] }], avisos: [] },
      { materias: [{ nome: "Português", topicos: "Crase" }], avisos: [] },
      { materias: [{ nome: "Português", topicos: [1] }], avisos: [] },
      { materias: [], avisos: "nenhum" },
      { materias: [] },
      null,
    ];
    for (const resposta of invalidas) {
      expect(respostaEditalSchema.safeParse(resposta).success).toBe(false);
    }
  });
});

describe("EDITAL_JSON_SCHEMA", () => {
  type No = {
    type?: string;
    properties?: Record<string, No>;
    required?: readonly string[];
    additionalProperties?: boolean;
    items?: No;
  };

  /** Modo strict: todo objeto fecha propriedades extras e exige todas as suas. */
  function conferirStrict(no: No) {
    if (no.type === "object") {
      expect(no.additionalProperties).toBe(false);
      expect([...(no.required ?? [])].sort()).toEqual(
        Object.keys(no.properties ?? {}).sort(),
      );
      Object.values(no.properties ?? {}).forEach(conferirStrict);
    }
    if (no.items) conferirStrict(no.items);
  }

  it("é compatível com o modo strict", () => {
    conferirStrict(EDITAL_JSON_SCHEMA);
  });
});
