import { describe, expect, it } from "vitest";

import {
  LIMITE_POR_DIA,
  LIMITE_POR_HORA,
  mensagemLimite,
  verificarLimite,
} from "./limite";

const MIN = 60 * 1000;
const agora = new Date("2026-11-17T15:00:00.000Z"); // 12:00 em São Paulo
const atras = (minutos: number) => new Date(agora.getTime() - minutos * MIN);

describe("verificarLimite — por hora", () => {
  it("permite até a 5ª tentativa na mesma hora", () => {
    const quatro = [1, 2, 3, 4].map(atras);
    expect(verificarLimite([], agora)).toEqual({ permitido: true });
    expect(verificarLimite(quatro, agora)).toEqual({ permitido: true });
  });

  it("bloqueia a 6ª e libera quando a mais antiga sai da janela", () => {
    const cinco = [50, 40, 30, 20, 10].map(atras);
    expect(LIMITE_POR_HORA).toBe(5);
    expect(verificarLimite(cinco, agora)).toEqual({
      permitido: false,
      liberaEm: new Date(atras(50).getTime() + 60 * MIN),
    });
  });

  it("tentativa de exatamente 1 h atrás já não conta", () => {
    const cinco = [60, 40, 30, 20, 10].map(atras);
    expect(verificarLimite(cinco, agora)).toEqual({ permitido: true });
    const naBorda = [59, 40, 30, 20, 10].map(atras);
    expect(verificarLimite(naBorda, agora).permitido).toBe(false);
  });
});

describe("verificarLimite — por dia", () => {
  // 19 tentativas espalhadas, uma a cada 70 min: nunca 5 na mesma hora.
  const dezenove = Array.from({ length: 19 }, (_, i) => atras(70 * (i + 1)));

  it("permite a 20ª tentativa do dia", () => {
    expect(LIMITE_POR_DIA).toBe(20);
    expect(verificarLimite(dezenove, agora)).toEqual({ permitido: true });
  });

  it("bloqueia a 21ª e libera 24 h depois da mais antiga", () => {
    const vinte = [...dezenove, atras(5)];
    expect(verificarLimite(vinte, agora)).toEqual({
      permitido: false,
      liberaEm: new Date(atras(70 * 19).getTime() + 24 * 60 * MIN),
    });
  });

  it("tentativa de exatamente 24 h atrás já não conta", () => {
    const vinte = [...dezenove.slice(1), atras(24 * 60), atras(5)];
    expect(verificarLimite(vinte, agora)).toEqual({ permitido: true });
  });

  it("com os dois limites estourados, vale o que libera mais tarde", () => {
    const tentativas = [
      ...Array.from({ length: 15 }, (_, i) => atras(23 * 60 - i)),
      ...[50, 40, 30, 20, 10].map(atras),
    ];
    const decisao = verificarLimite(tentativas, agora);
    expect(decisao).toEqual({
      permitido: false,
      liberaEm: new Date(atras(23 * 60).getTime() + 24 * 60 * MIN),
    });
  });
});

describe("mensagemLimite", () => {
  it("mostra só o horário quando libera hoje (fuso de São Paulo)", () => {
    expect(mensagemLimite(new Date("2026-11-17T15:40:00.000Z"), agora)).toBe(
      "Você atingiu o limite de extrações com IA. Tente de novo às 12:40 ou use a leitura padrão.",
    );
  });

  it("mostra a data quando libera em outro dia", () => {
    expect(
      mensagemLimite(new Date("2026-11-18T13:05:00.000Z"), agora),
    ).toContain("em 18/11 às 10:05");
  });
});
