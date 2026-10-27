import { AppNav } from "@/components/layout/app-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppNav />
      {/* Espaço para a barra inferior (celular) ou lateral (desktop). */}
      <div className="flex flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-60">
        {children}
      </div>
    </>
  );
}
