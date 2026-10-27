// Classes escritas por extenso para o Tailwind encontrá-las no código.
export const CORES = {
  blue: { label: "Azul", fundo: "bg-blue-500", borda: "border-l-blue-500" },
  emerald: {
    label: "Verde",
    fundo: "bg-emerald-500",
    borda: "border-l-emerald-500",
  },
  violet: {
    label: "Roxo",
    fundo: "bg-violet-500",
    borda: "border-l-violet-500",
  },
  rose: { label: "Rosa", fundo: "bg-rose-500", borda: "border-l-rose-500" },
  orange: {
    label: "Laranja",
    fundo: "bg-orange-500",
    borda: "border-l-orange-500",
  },
  amber: {
    label: "Amarelo",
    fundo: "bg-amber-500",
    borda: "border-l-amber-500",
  },
  teal: { label: "Turquesa", fundo: "bg-teal-500", borda: "border-l-teal-500" },
  slate: { label: "Cinza", fundo: "bg-slate-500", borda: "border-l-slate-500" },
} as const;

export type Cor = keyof typeof CORES;

export const CORES_IDS = Object.keys(CORES) as [Cor, ...Cor[]];

export function corDoConcurso(cor: string) {
  return CORES[cor as Cor] ?? CORES.blue;
}
