import { normalizarBusca } from "@/lib/filtro-edital";

export type MateriaExistente = { id: string; nome: string };
export type TopicoExistente = { id: string; titulo: string };

export type MateriaNova = {
  id?: string;
  nome: string;
  peso: number;
  topicos: { id?: string; titulo: string }[];
};

export type PlanoMateria = {
  /** Id da matéria existente reaproveitada; ausente = criar. */
  existenteId?: string;
  nome: string;
  peso: number;
  ordem: number;
  topicos: PlanoTopico[];
};

export type PlanoTopico = {
  /** Id do tópico existente reaproveitado (mantém status, nota e links); ausente = criar. */
  existenteId?: string;
  titulo: string;
  ordem: number;
};

export type PlanoEdital = {
  materias: PlanoMateria[];
  excluirMaterias: string[];
  excluirTopicos: string[];
};

/**
 * Planeja a troca da estrutura atual pela nova sem perder progresso:
 * 1. ids existentes deste concurso são reaproveitados (edição da estrutura);
 * 2. sem id válido, reaproveita pelo nome/título normalizado (reimportação);
 * 3. o que sobrar da estrutura antiga é excluído.
 * Ids desconhecidos (de outro concurso ou gerados no cliente) contam como novos.
 */
export function planejarEdital(
  existentes: { materias: MateriaExistente[]; topicos: TopicoExistente[] },
  novas: MateriaNova[],
): PlanoEdital {
  const materiasLivres = new Map(existentes.materias.map((m) => [m.id, m]));
  const topicosLivres = new Map(existentes.topicos.map((t) => [t.id, t]));

  const reservarPorId = <T>(livres: Map<string, T>, id: string | undefined) => {
    if (!id || !livres.has(id)) return undefined;
    livres.delete(id);
    return id;
  };

  // Primeiro os ids explícitos, para que a busca por título não "roube" um item que será mantido.
  const materiasPorId = novas.map((m) => reservarPorId(materiasLivres, m.id));
  const topicosPorId = novas.map((m) =>
    m.topicos.map((t) => reservarPorId(topicosLivres, t.id)),
  );

  const reservarPorTexto = <T extends { id: string }>(
    livres: Map<string, T>,
    texto: string,
    textoDe: (item: T) => string,
  ) => {
    const chave = normalizarBusca(texto);
    for (const item of livres.values()) {
      if (normalizarBusca(textoDe(item)) === chave) {
        livres.delete(item.id);
        return item.id;
      }
    }
    return undefined;
  };

  const materias = novas.map((materia, i) => ({
    existenteId:
      materiasPorId[i] ??
      reservarPorTexto(materiasLivres, materia.nome, (m) => m.nome),
    nome: materia.nome,
    peso: materia.peso,
    ordem: i,
    topicos: materia.topicos.map((topico, ordem) => ({
      existenteId:
        topicosPorId[i][ordem] ??
        reservarPorTexto(topicosLivres, topico.titulo, (t) => t.titulo),
      titulo: topico.titulo,
      ordem,
    })),
  }));

  return {
    materias,
    excluirMaterias: [...materiasLivres.keys()],
    excluirTopicos: [...topicosLivres.keys()],
  };
}
