import { describe, expect, it } from "vitest";

import {
  activeNavKey,
  concursoIdFromPath,
  concursoPadrao,
  navHrefs,
} from "@/lib/navigation";

describe("concursoIdFromPath", () => {
  it("extrai o id do concurso", () => {
    expect(concursoIdFromPath("/concursos/abc")).toBe("abc");
    expect(concursoIdFromPath("/concursos/abc/edital")).toBe("abc");
  });

  it("ignora a lista e a criação", () => {
    expect(concursoIdFromPath("/concursos")).toBeNull();
    expect(concursoIdFromPath("/concursos/novo")).toBeNull();
    expect(concursoIdFromPath("/conta")).toBeNull();
  });
});

describe("navHrefs", () => {
  it("aponta Painel, Agenda e Edital para o concurso aberto", () => {
    expect(navHrefs("/concursos/abc/configuracoes")).toEqual({
      concursos: "/concursos",
      painel: "/concursos/abc",
      agenda: "/concursos/abc/agenda",
      edital: "/concursos/abc/edital",
      conta: "/conta",
    });
  });

  it("sem concurso aberto, Painel, Agenda e Edital levam à lista", () => {
    const hrefs = navHrefs("/conta");
    expect(hrefs.painel).toBe("/concursos");
    expect(hrefs.agenda).toBe("/concursos");
    expect(hrefs.edital).toBe("/concursos");
  });
});

describe("concursoPadrao", () => {
  it("prefere o último acessado, se ainda existir", () => {
    expect(concursoPadrao(["a", "b"], "b")).toBe("b");
    expect(concursoPadrao(["a", "b"], "apagado")).toBeNull();
  });

  it("sem último acessado, usa o único concurso", () => {
    expect(concursoPadrao(["a"], null)).toBe("a");
    expect(concursoPadrao(["a"], "apagado")).toBe("a");
    expect(concursoPadrao(["a", "b"], null)).toBeNull();
    expect(concursoPadrao([], null)).toBeNull();
  });
});

describe("navHrefs com concurso padrão", () => {
  it("fora de um concurso, usa o padrão", () => {
    expect(navHrefs("/conta", "abc")).toMatchObject({
      painel: "/concursos/abc",
      agenda: "/concursos/abc/agenda",
      edital: "/concursos/abc/edital",
    });
  });

  it("o concurso da URL tem precedência", () => {
    expect(navHrefs("/concursos/xyz", "abc").painel).toBe("/concursos/xyz");
  });
});

describe("activeNavKey", () => {
  it.each([
    ["/concursos", "concursos"],
    ["/concursos/novo", "concursos"],
    ["/concursos/abc", "painel"],
    ["/concursos/abc/configuracoes", "painel"],
    ["/concursos/abc/edital", "edital"],
    ["/concursos/abc/agenda", "agenda"],
    ["/concursos/abc/afinidade", "agenda"],
    ["/conta", "conta"],
    ["/outra", null],
  ])("%s → %s", (pathname, expected) => {
    expect(activeNavKey(pathname)).toBe(expected);
  });
});
