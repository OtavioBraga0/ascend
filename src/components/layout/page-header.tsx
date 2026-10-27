import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/** Cabeçalho fixo no topo de cada tela do app. */
export function PageHeader({
  title,
  voltar,
  action,
}: {
  title: ReactNode;
  /** Destino do botão de voltar, se houver. */
  voltar?: string;
  action?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-1 px-4">
        {voltar && (
          <Link
            href={voltar}
            aria-label="Voltar"
            className="-ml-2 flex size-10 shrink-0 items-center justify-center rounded-lg outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </Link>
        )}
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">
          {title}
        </h1>
        {action}
      </div>
    </header>
  );
}

export function PageHeaderSkeleton() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
        <div className="h-5 w-48 animate-pulse rounded bg-muted" />
      </div>
    </header>
  );
}
