"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/** Tela de erro inesperado, com opção de tentar de novo. */
export function Falha({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const codigo =
    error instanceof Error &&
    "digest" in error &&
    typeof error.digest === "string"
      ? error.digest
      : null;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <AlertTriangle className="size-10 text-muted-foreground" aria-hidden />
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Algo deu errado</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Não foi possível carregar esta tela. Verifique sua conexão e tente de
          novo.
        </p>
        {codigo && (
          <p className="text-xs text-muted-foreground">Código: {codigo}</p>
        )}
      </div>
      <div className="flex gap-2">
        <Button size="lg" className="h-11" onClick={() => retry()}>
          Tentar de novo
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-11"
          render={<Link href="/concursos" />}
        >
          Ir para o início
        </Button>
      </div>
    </main>
  );
}
