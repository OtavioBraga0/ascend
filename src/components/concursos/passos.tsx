import { cn } from "@/lib/utils";

const PASSOS = [
  "Dados do concurso",
  "Conteúdo programático",
  "Revisão",
  "Afinidade",
];

/** Indicador do assistente de novo concurso (passos 1 a 4). */
export function Passos({ atual }: { atual: 1 | 2 | 3 | 4 }) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Passo {atual} de {PASSOS.length} ·{" "}
        <span className="font-medium text-foreground">{PASSOS[atual - 1]}</span>
      </p>
      <div className="grid grid-cols-4 gap-1.5" aria-hidden>
        {PASSOS.map((passo, i) => (
          <div
            key={passo}
            className={cn(
              "h-1 rounded-full",
              i < atual ? "bg-primary" : "bg-muted",
            )}
          />
        ))}
      </div>
    </div>
  );
}
