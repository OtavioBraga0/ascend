import { StatusTopico } from "@/generated/prisma/enums";

export { StatusTopico };

export const STATUS_ORDEM = [
  StatusTopico.NAO_INICIADO,
  StatusTopico.TEORIA,
  StatusTopico.EXERCICIOS,
  StatusTopico.REVISADO,
] as const;

// Classes por extenso para o Tailwind encontrá-las no código.
export const STATUS_INFO: Record<
  StatusTopico,
  { label: string; chip: string; ponto: string; barra: string }
> = {
  NAO_INICIADO: {
    label: "Não iniciado",
    chip: "bg-muted text-muted-foreground",
    ponto: "bg-zinc-400",
    barra: "bg-zinc-300 dark:bg-zinc-600",
  },
  TEORIA: {
    label: "Teoria",
    chip: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
    ponto: "bg-sky-400",
    barra: "bg-sky-300 dark:bg-sky-700",
  },
  EXERCICIOS: {
    label: "Exercícios",
    chip: "bg-blue-600 text-white dark:bg-blue-500",
    ponto: "bg-blue-600",
    barra: "bg-blue-600 dark:bg-blue-500",
  },
  REVISADO: {
    label: "Revisado",
    chip: "bg-green-600 text-white dark:bg-green-600",
    ponto: "bg-green-600",
    barra: "bg-green-600",
  },
};
