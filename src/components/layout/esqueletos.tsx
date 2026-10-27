import { PageHeaderSkeleton } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";

function Bloco({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-muted", className)} />;
}

function Esqueleto({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeaderSkeleton />
      <main
        role="status"
        aria-label="Carregando"
        className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-6"
      >
        {children}
        <span className="sr-only">Carregando…</span>
      </main>
    </>
  );
}

export function PainelEsqueleto() {
  return (
    <Esqueleto>
      <Bloco className="h-20" />
      <Bloco className="h-36" />
      <div className="grid grid-cols-2 gap-3">
        <Bloco className="h-28" />
        <Bloco className="h-28" />
      </div>
      <Bloco className="h-72" />
    </Esqueleto>
  );
}

export function EditalEsqueleto() {
  return (
    <Esqueleto>
      <Bloco className="h-11" />
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <Bloco key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      {[0, 1, 2, 3].map((i) => (
        <Bloco key={i} className="h-24" />
      ))}
    </Esqueleto>
  );
}

export function FormularioEsqueleto() {
  return (
    <Esqueleto>
      <Bloco className="h-5 w-40 rounded-md" />
      {[0, 1, 2].map((i) => (
        <Bloco key={i} className="h-11" />
      ))}
      <Bloco className="h-40" />
    </Esqueleto>
  );
}
