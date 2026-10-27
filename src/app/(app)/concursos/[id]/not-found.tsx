import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function ConcursoNaoEncontrado() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold">Concurso não encontrado</h1>
      <p className="text-sm text-muted-foreground">
        Ele pode ter sido excluído, ou o link está incorreto.
      </p>
      <Button variant="outline" render={<Link href="/concursos" />}>
        Ver meus concursos
      </Button>
    </main>
  );
}
