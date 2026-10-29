import { describe, expect, it } from "vitest";

import { activeNavKey, concursoIdFromPath, navHrefs } from "@/lib/navigation";

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
