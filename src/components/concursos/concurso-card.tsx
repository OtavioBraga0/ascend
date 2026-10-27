import { CalendarDays, ChevronRight } from "lucide-react";
import Link from "next/link";

import { corDoConcurso } from "@/lib/cores";
import { descreverPrazo, diasAte, formatarData } from "@/lib/datas";
import { cn } from "@/lib/utils";
import type { Concurso } from "@/server/data/concursos";

export function ConcursoCard({ concurso }: { concurso: Concurso }) {
  const detalhes = [concurso.banca, concurso.cargo].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/concursos/${concurso.id}`}
      className={cn(
        "flex items-center gap-3 rounded-xl border border-l-4 bg-card p-4 transition-colors outline-none",
        "hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50",
        corDoConcurso(concurso.cor).borda,
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <h2 className="truncate font-medium">{concurso.nome}</h2>
        {detalhes && (
          <p className="truncate text-sm text-muted-foreground">{detalhes}</p>
        )}
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarDays className="size-4 shrink-0" aria-hidden />
          {concurso.dataProva ? (
            <span>
              {formatarData(concurso.dataProva)} ·{" "}
              <span className="font-medium text-foreground">
                {descreverPrazo(diasAte(concurso.dataProva))}
              </span>
            </span>
          ) : (
            <span>Sem data da prova</span>
          )}
        </p>
      </div>
      <ChevronRight
        className="size-5 shrink-0 text-muted-foreground"
        aria-hidden
      />
    </Link>
  );
}
