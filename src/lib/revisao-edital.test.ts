import { describe, expect, it } from "vitest";

import {
  contarTopicos,
  criarRevisao,
  problemasRevisao,
  revisaoReducer,
  type MateriaRevisao,
} from "@/lib/revisao-edital";

function estadoInicial(): MateriaRevisao[] {
  let n = 0;
  return criarRevisao(
    [
      { nome: "Português", topicos: ["Crase", "Pontuação", "Regência"] },
      { nome: "Matemática", topicos: ["Porcentagem", "Crase"] },
    ],
    () => `id${++n}`,
  );
}
// ids: Português=id1 (Crase=id2, Pontuação=id3, Regência=id4), Matemática=id5 (Porcentagem=id6, Crase=id7)

const titulos = (estado: MateriaRevisao[]) =>
  Object.fromEntries(
    estado.map((m) => [m.nome, m.topicos.map((t) => t.titulo)]),
  );

describe("revisaoReducer", () => {
  it("cria o estado com peso 1 e ids únicos", () => {
    const estado = estadoInicial();
    expect(estado.map((m) => m.peso)).toEqual([1, 1]);
    expect(contarTopicos(estado)).toBe(5);
  });

  it("renomeia, exclui e adiciona matérias e tópicos", () => {
    let estado = estadoInicial();
    estado = revisaoReducer(estado, {
      tipo: "renomearMateria",
      materiaId: "id5",
      nome: "Mat",
    });
    estado = revisaoReducer(estado, {
      tipo: "renomearTopico",
      topicoId: "id3",
      titulo: "Vírgula",
    });
    estado = revisaoReducer(estado, { tipo: "excluirTopico", topicoId: "id4" });
    estado = revisaoReducer(estado, {
      tipo: "adicionarTopico",
      materiaId: "id5",
      id: "n1",
      titulo: "Juros",
    });
    estado = revisaoReducer(estado, {
      tipo: "adicionarMateria",
      id: "n2",
      nome: "Informática",
    });
    expect(titulos(estado)).toEqual({
      Português: ["Crase", "Vírgula"],
      Mat: ["Porcentagem", "Crase", "Juros"],
      Informática: [],
    });
    estado = revisaoReducer(estado, {
      tipo: "excluirMateria",
      materiaId: "id1",
    });
    expect(estado.map((m) => m.nome)).toEqual(["Mat", "Informática"]);
  });

  it("limita o peso entre 1 e 5", () => {
    let estado = estadoInicial();
    estado = revisaoReducer(estado, {
      tipo: "definirPeso",
      materiaId: "id1",
      peso: 9,
    });
    estado = revisaoReducer(estado, {
      tipo: "definirPeso",
      materiaId: "id5",
      peso: 0,
    });
    expect(estado.map((m) => m.peso)).toEqual([5, 1]);
  });

  it("move tópico dentro da mesma matéria e entre matérias", () => {
    let estado = estadoInicial();
    estado = revisaoReducer(estado, {
      tipo: "moverTopico",
      topicoId: "id4",
      paraMateriaId: "id1",
      indice: 0,
    });
    expect(titulos(estado).Português).toEqual([
      "Regência",
      "Crase",
      "Pontuação",
    ]);

    estado = revisaoReducer(estado, {
      tipo: "moverTopico",
      topicoId: "id3",
      paraMateriaId: "id5",
      indice: 99,
    });
    expect(titulos(estado)).toEqual({
      Português: ["Regência", "Crase"],
      Matemática: ["Porcentagem", "Crase", "Pontuação"],
    });
  });

  it("ignora movimentos para matéria inexistente", () => {
    const estado = estadoInicial();
    expect(
      revisaoReducer(estado, {
        tipo: "moverTopico",
        topicoId: "id2",
        paraMateriaId: "x",
        indice: 0,
      }),
    ).toBe(estado);
  });

  it("mescla matérias sem duplicar tópicos iguais", () => {
    const estado = revisaoReducer(estadoInicial(), {
      tipo: "mesclarMaterias",
      origemId: "id5",
      destinoId: "id1",
    });
    expect(titulos(estado)).toEqual({
      Português: ["Crase", "Pontuação", "Regência", "Porcentagem"],
    });
  });

  it("aponta problemas que impedem salvar", () => {
    let estado = estadoInicial();
    expect(problemasRevisao(estado)).toEqual([]);
    estado = revisaoReducer(estado, {
      tipo: "renomearMateria",
      materiaId: "id1",
      nome: " ",
    });
    estado = revisaoReducer(estado, {
      tipo: "renomearTopico",
      topicoId: "id6",
      titulo: "",
    });
    expect(problemasRevisao(estado)).toEqual([
      "Há matérias sem nome.",
      "Há tópicos sem texto.",
    ]);
    expect(problemasRevisao([])).toEqual(["Adicione pelo menos uma matéria."]);
  });
});
