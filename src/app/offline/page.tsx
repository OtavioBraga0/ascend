import { WifiOff } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sem conexão · Ascend" };

// Servida pelo service worker quando a navegação falha por falta de rede.
export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
      <WifiOff className="size-8 text-muted-foreground" aria-hidden />
      <h1 className="text-xl font-semibold">Você está sem conexão</h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        Verifique sua internet e tente de novo. Seu progresso fica salvo no
        servidor.
      </p>
    </main>
  );
}
