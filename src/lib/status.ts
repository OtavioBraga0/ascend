import { StatusTopico } from "@/generated/prisma/enums";

export { StatusTopico };

export const STATUS_ORDEM = [
  StatusTopico.NAO_INICIADO,
  StatusTopico.TEORIA,
  StatusTopico.EXERCICIOS,
  StatusTopico.REVISADO,
] as const;

/** Cor de cada status como variável CSS (usada nos gráficos SVG). */
export const STATUS_COR: Record<StatusTopico, string> = {
  NAO_INICIADO: "var(--status-nao-iniciado)",
  TEORIA: "var(--status-teoria)",
  EXERCICIOS: "var(--status-exercicios)",
  REVISADO: "var(--status-revisado)",
};

// Classes por extenso para o Tailwind encontrá-las no código. As cores das
// marcas (ponto/barra) vêm dos tokens --status-* em globals.css, validados
// para daltonismo nos temas claro e escuro; os chips usam tons com contraste
// suficiente para texto.
export const STATUS_INFO: Record<
  StatusTopico,
  { label: string; chip: string; ponto: string; barra: string }
> = {
  NAO_INICIADO: {
    label: "Não iniciado",
    chip: "bg-muted text-neutral-600 dark:text-neutral-300",
    ponto: "bg-status-nao-iniciado",
    barra: "bg-status-nao-iniciado",
  },
  TEORIA: {
    label: "Teoria",
    chip: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100",
    ponto: "bg-status-teoria",
    barra: "bg-status-teoria",
  },
  EXERCICIOS: {
    label: "Exercícios",
    chip: "bg-blue-700 text-white dark:bg-blue-600",
    ponto: "bg-status-exercicios",
    barra: "bg-status-exercicios",
  },
  REVISADO: {
    label: "Revisado",
    chip: "bg-green-700 text-white",
    ponto: "bg-status-revisado",
    barra: "bg-status-revisado",
  },
};
