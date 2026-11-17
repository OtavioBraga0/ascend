import Link from "next/link";

/** Páginas públicas de links compartilhados: cabeçalho simples, sem a navegação do app. */
export default function CompartilhadoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
          <Link
            href="/concursos"
            className="text-lg font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Ascend
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-6">
        {children}
      </main>
    </>
  );
}
