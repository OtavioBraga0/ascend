import type { StatusTopico } from "@/generated/prisma/enums";

/** Minúsculas e sem acentos, para a busca ignorar ambos. */
export function normalizarBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

type Filtro = { busca: string; status: StatusTopico | null };
type Topico = { titulo: string; status: StatusTopico };

/**
 * Mantém as matérias com tópicos que atendem à busca e ao status. Se o nome da
 * matéria casar com a busca, todos os tópicos dela entram (respeitando o status).
 */
export function filtrarEdital<
  T extends Topico,
  M extends { nome: string; topicos: T[] },
>(materias: M[], { busca, status }: Filtro): M[] {
  const termo = normalizarBusca(busca);
  if (!termo && !status) return materias;

  return materias.flatMap((materia) => {
    const materiaCasa =
      !!termo && normalizarBusca(materia.nome).includes(termo);
    const topicos = materia.topicos.filter(
      (t) =>
        (!status || t.status === status) &&
        (!termo || materiaCasa || normalizarBusca(t.titulo).includes(termo)),
    );
    return topicos.length > 0 ? [{ ...materia, topicos }] : [];
  });
}
