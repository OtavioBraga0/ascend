import { Button } from "@/components/ui/button";

// Página provisória: a partir da etapa 2 a raiz redireciona para /concursos.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Ascend</h1>
        <p className="text-muted-foreground">
          Seus estudos para concursos, organizados a partir do edital.
        </p>
      </div>
      <Button size="lg">Em breve</Button>
    </main>
  );
}
