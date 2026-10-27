import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NaoEncontrada() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <h1 className="text-xl font-semibold">Página não encontrada</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        O endereço pode estar incorreto, ou a página foi removida.
      </p>
      <Button size="lg" className="h-11" render={<Link href="/concursos" />}>
        Ir para meus concursos
      </Button>
    </main>
  );
}
