import { PageHeader } from "@/components/layout/page-header";

// Provisória: a lista de concursos entra na etapa 4.
export default function ConcursosPage() {
  return (
    <>
      <PageHeader title="Meus concursos" />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <p className="text-sm text-muted-foreground">
          Nenhum concurso cadastrado ainda.
        </p>
      </main>
    </>
  );
}
