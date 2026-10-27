import { normalizarBusca } from "@/lib/filtro-edital";
import type { MateriaParseada } from "@/lib/parser-edital";

export type TopicoRevisao = { id: string; titulo: string };
export type MateriaRevisao = {
  id: string;
  nome: string;
  peso: number;
  topicos: TopicoRevisao[];
};

export const PESO_MIN = 1;
export const PESO_MAX = 5;

export type AcaoRevisao =
  | { tipo: "adicionarMateria"; id: string; nome: string }
  | { tipo: "renomearMateria"; materiaId: string; nome: string }
  | { tipo: "excluirMateria"; materiaId: string }
  | { tipo: "definirPeso"; materiaId: string; peso: number }
  | { tipo: "mesclarMaterias"; origemId: string; destinoId: string }
  | { tipo: "adicionarTopico"; materiaId: string; id: string; titulo: string }
  | { tipo: "renomearTopico"; topicoId: string; titulo: string }
  | { tipo: "excluirTopico"; topicoId: string }
  | {
      tipo: "moverTopico";
      topicoId: string;
      paraMateriaId: string;
      indice: number;
    };

/**
 * Converte o resultado do parser em estado editável, gerando ids locais.
 * Na reimportação, matérias com o mesmo nome de uma existente herdam o id e o
 * peso dela (o id permite ao servidor manter o progresso).
 */
export function criarRevisao(
  materias: MateriaParseada[],
  gerarId: () => string,
  existentes: { id: string; nome: string; peso: number }[] = [],
): MateriaRevisao[] {
  const livres = new Map(existentes.map((m) => [normalizarBusca(m.nome), m]));
  return materias.map((materia) => {
    const chave = normalizarBusca(materia.nome);
    const existente = livres.get(chave);
    livres.delete(chave);
    return {
      id: existente?.id ?? gerarId(),
      nome: materia.nome,
      peso: existente?.peso ?? PESO_MIN,
      topicos: materia.topicos.map((titulo) => ({ id: gerarId(), titulo })),
    };
  });
}

export function revisaoReducer(
  estado: MateriaRevisao[],
  acao: AcaoRevisao,
): MateriaRevisao[] {
  switch (acao.tipo) {
    case "adicionarMateria":
      return [
        ...estado,
        { id: acao.id, nome: acao.nome, peso: PESO_MIN, topicos: [] },
      ];

    case "renomearMateria":
      return atualizarMateria(estado, acao.materiaId, (m) => ({
        ...m,
        nome: acao.nome,
      }));

    case "excluirMateria":
      return estado.filter((m) => m.id !== acao.materiaId);

    case "definirPeso": {
      const peso = Math.min(
        PESO_MAX,
        Math.max(PESO_MIN, Math.round(acao.peso)),
      );
      return atualizarMateria(estado, acao.materiaId, (m) => ({ ...m, peso }));
    }

    case "mesclarMaterias": {
      const origem = estado.find((m) => m.id === acao.origemId);
      if (!origem || acao.origemId === acao.destinoId) return estado;
      return estado
        .filter((m) => m.id !== acao.origemId)
        .map((m) => {
          if (m.id !== acao.destinoId) return m;
          // Tópicos com o mesmo título não são duplicados.
          const titulos = new Set(m.topicos.map((t) => t.titulo));
          const novos = origem.topicos.filter((t) => !titulos.has(t.titulo));
          return { ...m, topicos: [...m.topicos, ...novos] };
        });
    }

    case "adicionarTopico":
      return atualizarMateria(estado, acao.materiaId, (m) => ({
        ...m,
        topicos: [...m.topicos, { id: acao.id, titulo: acao.titulo }],
      }));

    case "renomearTopico":
      return estado.map((m) => ({
        ...m,
        topicos: m.topicos.map((t) =>
          t.id === acao.topicoId ? { ...t, titulo: acao.titulo } : t,
        ),
      }));

    case "excluirTopico":
      return estado.map((m) => ({
        ...m,
        topicos: m.topicos.filter((t) => t.id !== acao.topicoId),
      }));

    case "moverTopico": {
      const topico = encontrarTopico(estado, acao.topicoId)?.topico;
      if (!topico || !estado.some((m) => m.id === acao.paraMateriaId))
        return estado;
      return estado.map((m) => {
        const topicos = m.topicos.filter((t) => t.id !== acao.topicoId);
        if (m.id !== acao.paraMateriaId) {
          return topicos.length === m.topicos.length ? m : { ...m, topicos };
        }
        const indice = Math.min(Math.max(acao.indice, 0), topicos.length);
        return {
          ...m,
          topicos: [
            ...topicos.slice(0, indice),
            topico,
            ...topicos.slice(indice),
          ],
        };
      });
    }
  }
}

export function encontrarTopico(estado: MateriaRevisao[], topicoId: string) {
  for (const materia of estado) {
    const indice = materia.topicos.findIndex((t) => t.id === topicoId);
    if (indice >= 0)
      return { materia, indice, topico: materia.topicos[indice] };
  }
  return null;
}

export function contarTopicos(estado: MateriaRevisao[]) {
  return estado.reduce((total, m) => total + m.topicos.length, 0);
}

/** Problemas que impedem salvar (nomes vazios). */
export function problemasRevisao(estado: MateriaRevisao[]): string[] {
  const problemas: string[] = [];
  if (estado.length === 0) problemas.push("Adicione pelo menos uma matéria.");
  if (estado.some((m) => !m.nome.trim()))
    problemas.push("Há matérias sem nome.");
  if (estado.some((m) => m.topicos.some((t) => !t.titulo.trim()))) {
    problemas.push("Há tópicos sem texto.");
  }
  return problemas;
}

function atualizarMateria(
  estado: MateriaRevisao[],
  materiaId: string,
  atualizar: (materia: MateriaRevisao) => MateriaRevisao,
) {
  return estado.map((m) => (m.id === materiaId ? atualizar(m) : m));
}
