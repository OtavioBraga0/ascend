import { describe, expect, it } from "vitest";

import {
  dataParaIso,
  descreverPrazo,
  diasAte,
  formatarData,
  hojeIso,
  isIsoValido,
  isoParaData,
} from "@/lib/datas";

describe("hojeIso", () => {
  it("usa o fuso de São Paulo (UTC-3)", () => {
    // 01:30 UTC do dia 28 ainda é dia 27 em São Paulo.
    expect(hojeIso(new Date("2026-10-28T01:30:00Z"))).toBe("2026-10-27");
    expect(hojeIso(new Date("2026-10-28T03:00:00Z"))).toBe("2026-10-28");
  });
});

describe("conversão de datas sem horário", () => {
  it("ida e volta preservam o dia", () => {
    expect(dataParaIso(isoParaData("2027-03-14"))).toBe("2027-03-14");
  });

  it("formata como dd/mm/aaaa", () => {
    expect(formatarData(isoParaData("2027-03-04"))).toBe("04/03/2027");
  });

  it("valida datas do calendário", () => {
    expect(isIsoValido("2027-02-28")).toBe(true);
    expect(isIsoValido("2027-02-31")).toBe(false);
    expect(isIsoValido("27/02/2027")).toBe(false);
  });
});

describe("diasAte", () => {
  const prova = isoParaData("2026-11-10");

  it("conta dias inteiros a partir de hoje em São Paulo", () => {
    expect(diasAte(prova, new Date("2026-10-27T15:00:00Z"))).toBe(14);
    // 23h em São Paulo do dia 27 (02h UTC do dia 28) ainda conta como dia 27.
    expect(diasAte(prova, new Date("2026-10-28T02:00:00Z"))).toBe(14);
  });

  it("é zero no dia da prova e negativo depois", () => {
    expect(diasAte(prova, new Date("2026-11-10T12:00:00Z"))).toBe(0);
    expect(diasAte(prova, new Date("2026-11-11T12:00:00Z"))).toBe(-1);
  });
});

describe("descreverPrazo", () => {
  it.each([
    [10, "Faltam 10 dias"],
    [1, "Falta 1 dia"],
    [0, "A prova é hoje"],
    [-3, "Prova realizada"],
  ])("%i → %s", (dias, texto) => {
    expect(descreverPrazo(dias)).toBe(texto);
  });
});
