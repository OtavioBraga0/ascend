import { ButtonLink } from "@/components/ui/button-link";

export function LinkIndisponivel() {
  return (
    <section className="flex flex-col items-center gap-3 px-2 py-10 text-center">
      <h1 className="text-xl font-semibold">Link indisponível</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Quem compartilhou pode ter parado de compartilhar ou excluído o
        concurso. Peça um link novo.
      </p>
      <ButtonLink size="lg" className="h-11" href="/concursos">
        Ir para o Ascend
      </ButtonLink>
    </section>
  );
}
