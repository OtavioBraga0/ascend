export const FUSO = "America/Sao_Paulo";

const DIA_MS = 24 * 60 * 60 * 1000;

const isoNoFuso = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Data de hoje (`AAAA-MM-DD`) no fuso de São Paulo. */
export function hojeIso(agora: Date = new Date()): string {
  return isoNoFuso.format(agora);
}

/**
 * Datas sem horário (`@db.Date`) chegam do Prisma como meia-noite UTC;
 * estas funções convertem entre esse formato e `AAAA-MM-DD`.
 */
export function dataParaIso(data: Date): string {
  return data.toISOString().slice(0, 10);
}

export function isoParaData(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

/** `AAAA-MM-DD` válido no calendário (rejeita 31/02, por exemplo). */
export function isIsoValido(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const data = isoParaData(iso);
  return !Number.isNaN(data.getTime()) && dataParaIso(data) === iso;
}

/** `dd/mm/aaaa`. */
export function formatarData(data: Date): string {
  const [ano, mes, dia] = dataParaIso(data).split("-");
  return `${dia}/${mes}/${ano}`;
}

/** Dias inteiros entre hoje (em São Paulo) e a data; negativo se já passou. */
export function diasAte(data: Date, agora: Date = new Date()): number {
  return Math.round(
    (data.getTime() - isoParaData(hojeIso(agora)).getTime()) / DIA_MS,
  );
}

export function descreverPrazo(dias: number): string {
  if (dias < 0) return "Prova realizada";
  if (dias === 0) return "A prova é hoje";
  if (dias === 1) return "Falta 1 dia";
  return `Faltam ${dias} dias`;
}

const diaDaSemana = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
});

/** `Hoje`, `Amanhã` ou `qui., 30/10`, para uma data `AAAA-MM-DD`. */
export function rotuloDia(iso: string, hoje: string = hojeIso()): string {
  const dias = Math.round(
    (isoParaData(iso).getTime() - isoParaData(hoje).getTime()) / DIA_MS,
  );
  if (dias === 0) return "Hoje";
  if (dias === 1) return "Amanhã";
  return diaDaSemana.format(isoParaData(iso));
}
