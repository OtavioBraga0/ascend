import type { ReactNode } from "react";

/** Cabeçalho fixo no topo de cada tela do app. */
export function PageHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-2 px-4">
        <h1 className="truncate text-lg font-semibold">{title}</h1>
        {action}
      </div>
    </header>
  );
}
