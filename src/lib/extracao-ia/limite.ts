import { FUSO, hojeIso } from "@/lib/datas";

export const LIMITE_POR_HORA = 5;
export const LIMITE_POR_DIA = 20;

const HORA_MS = 60 * 60 * 1000;
const DIA_MS = 24 * HORA_MS;

export type DecisaoLimite =
  { permitido: true } | { permitido: false; liberaEm: Date };

/**
 * Decide se o usuário pode tentar de novo, a partir das tentativas das
 * últimas 24 h (sucesso ou falha). Se não puder, diz quando libera.
 */
export function verificarLimite(
  tentativas: Date[],
  agora: Date,
): DecisaoLimite {
  let liberaEm: Date | null = null;
  for (const [limite, janela] of [
    [LIMITE_POR_HORA, HORA_MS],
    [LIMITE_POR_DIA, DIA_MS],
  ] as const) {
    const naJanela = tentativas
      .map((t) => t.getTime())
      .filter((t) => t > agora.getTime() - janela && t <= agora.getTime())
      .sort((a, b) => a - b);
    if (naJanela.length < limite) continue;
    // Libera quando sair da janela a tentativa que deixa o total abaixo do limite.
    const libera = new Date(naJanela[naJanela.length - limite] + janela);
    if (!liberaEm || libera > liberaEm) liberaEm = libera;
  }
  return liberaEm ? { permitido: false, liberaEm } : { permitido: true };
}

const hora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  hour: "2-digit",
  minute: "2-digit",
});
const diaMes = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  day: "2-digit",
  month: "2-digit",
});

export function mensagemLimite(liberaEm: Date, agora: Date): string {
  const quando =
    hojeIso(liberaEm) === hojeIso(agora)
      ? `às ${hora.format(liberaEm)}`
      : `em ${diaMes.format(liberaEm)} às ${hora.format(liberaEm)}`;
  return `Você atingiu o limite de extrações com IA. Tente de novo ${quando} ou use a leitura padrão.`;
}
