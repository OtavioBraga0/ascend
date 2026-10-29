import { z } from "zod";

import { horariosDoDia } from "@/lib/agenda";

/** Ordem de exibição: a semana começa na segunda. 0 = domingo. */
export const DIAS_SEMANA = [
  { valor: 1, curto: "Seg", nome: "Segunda" },
  { valor: 2, curto: "Ter", nome: "Terça" },
  { valor: 3, curto: "Qua", nome: "Quarta" },
  { valor: 4, curto: "Qui", nome: "Quinta" },
  { valor: 5, curto: "Sex", nome: "Sexta" },
  { valor: 6, curto: "Sáb", nome: "Sábado" },
  { valor: 0, curto: "Dom", nome: "Domingo" },
] as const;

/** De 30 min a 12 h, de meia em meia hora. */
export const MINUTOS_POR_DIA = Array.from(
  { length: 24 },
  (_, i) => (i + 1) * 30,
);
export const DURACOES_BLOCO = [30, 45, 50, 60, 90, 120] as const;
export const PAUSAS = [0, 5, 10, 15, 20, 30] as const;

export const ROTINA_PADRAO = {
  diasSemana: [1, 2, 3, 4, 5],
  inicioMinutos: 19 * 60,
  minutosPorDia: 2 * 60,
  duracaoBloco: 60,
  pausa: 15,
};

const numeroDaLista = (lista: readonly number[], mensagem: string) =>
  z.coerce.number().refine((n) => lista.includes(n), mensagem);

export const rotinaSchema = z
  .object({
    diasSemana: z
      .array(z.coerce.number().int().min(0).max(6))
      .min(1, "Escolha pelo menos um dia.")
      .transform((dias) => [...new Set(dias)].sort((a, b) => a - b)),
    inicioMinutos: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe o horário de início.")
      .transform((hora) => {
        const [h, m] = hora.split(":").map(Number);
        return h * 60 + m;
      }),
    minutosPorDia: numeroDaLista(
      MINUTOS_POR_DIA,
      "Escolha quanto tempo por dia.",
    ),
    duracaoBloco: numeroDaLista(DURACOES_BLOCO, "Escolha a duração do bloco."),
    pausa: numeroDaLista(PAUSAS, "Escolha a pausa."),
  })
  .refine((rotina) => (horariosDoDia(rotina).at(-1)?.fim ?? 0) <= 24 * 60, {
    path: ["inicioMinutos"],
    message: "Com esse início, os estudos passariam da meia-noite.",
  });

export type RotinaInput = z.output<typeof rotinaSchema>;

/** Valores do formulário como texto, para reexibir após um erro. */
export type RotinaFormValues = {
  diasSemana: string[];
  inicioMinutos: string;
  minutosPorDia: string;
  duracaoBloco: string;
  pausa: string;
};

export function lerRotinaForm(formData: FormData): RotinaFormValues {
  const texto = (campo: string) => String(formData.get(campo) ?? "");
  return {
    diasSemana: formData.getAll("diasSemana").map(String),
    inicioMinutos: texto("inicioMinutos"),
    minutosPorDia: texto("minutosPorDia"),
    duracaoBloco: texto("duracaoBloco"),
    pausa: texto("pausa"),
  };
}

/** `Seg a Sex`, `Todos os dias` ou `Seg, Qua, Sáb`. */
export function descreverDias(diasSemana: number[]): string {
  const posicoes = DIAS_SEMANA.map((d, i) =>
    diasSemana.includes(d.valor) ? i : -1,
  ).filter((i) => i >= 0);
  if (posicoes.length === 7) return "Todos os dias";
  const seguidos = posicoes.every(
    (p, i) => i === 0 || p === posicoes[i - 1] + 1,
  );
  if (posicoes.length >= 3 && seguidos) {
    return `${DIAS_SEMANA[posicoes[0]].curto} a ${DIAS_SEMANA[posicoes.at(-1)!].curto}`;
  }
  return posicoes.map((p) => DIAS_SEMANA[p].curto).join(", ");
}
