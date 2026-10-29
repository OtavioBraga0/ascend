import type {
  Dificuldade,
  Prioridade,
  StatusTopico,
} from "@/generated/prisma/enums";
import { dataParaIso, isoParaData } from "@/lib/datas";
import { PESO_PRIORIDADE, VALOR_STATUS } from "@/lib/progresso";

const DIA_MS = 24 * 60 * 60 * 1000;

/** Sobra do dia menor que essa fração do bloco não vira bloco. */
export const FRACAO_MINIMA_BLOCO = 0.5;

/** Limite da simulação: depois disso, a agenda diz só "mais de 3 anos". */
const MAX_DIAS = 3 * 366;

/** Blocos de estudo de um tópico não iniciado, conforme a dificuldade. */
export const BLOCOS_POR_TOPICO: Record<Dificuldade, number> = {
  FACIL: 1,
  NEUTRO: 2,
  DIFICIL: 3,
};

/** Multiplica o peso da matéria na divisão dos blocos entre as matérias. */
const FATOR_DIFICULDADE: Record<Dificuldade, number> = {
  FACIL: 1,
  NEUTRO: 1.5,
  DIFICIL: 2,
};

export type RotinaAgenda = {
  diasSemana: number[];
  inicioMinutos: number;
  minutosPorDia: number;
  duracaoBloco: number;
  pausa: number;
};

type TopicoAgenda = {
  id: string;
  titulo: string;
  ordem: number;
  status: StatusTopico;
  dificuldade: Dificuldade | null;
};

type MateriaAgenda = {
  id: string;
  nome: string;
  peso: number;
  prioridade: Prioridade;
  dificuldade: Dificuldade;
  ordem: number;
  topicos: TopicoAgenda[];
};

export type Horario = { inicio: number; fim: number };

export type BlocoAgenda = Horario & {
  materiaId: string;
  materiaNome: string;
  topicoId: string;
  topicoTitulo: string;
  /** Qual bloco do tópico é este (1 a `partes`). */
  parte: number;
  partes: number;
};

export type DiaAgenda = { data: string; blocos: BlocoAgenda[] };

export type Agenda = {
  /** Dias de estudo dentro da janela pedida (e antes da prova). */
  dias: DiaAgenda[];
  blocosPendentes: number;
  /** Data do último bloco; `null` sem pendências ou além de 3 anos. */
  termino: string | null;
  /** Blocos que ficam para depois da prova (0 sem data de prova). */
  blocosSemTempo: number;
};

/**
 * Horários dos blocos de um dia: blocos cheios separados pela pausa e, se
 * sobrar pelo menos metade de um bloco, um bloco menor no fim.
 */
export function horariosDoDia(rotina: RotinaAgenda): Horario[] {
  const horarios: Horario[] = [];
  let restante = rotina.minutosPorDia;
  let inicio = rotina.inicioMinutos;
  while (
    rotina.duracaoBloco > 0 &&
    restante >= rotina.duracaoBloco * FRACAO_MINIMA_BLOCO
  ) {
    const duracao = Math.min(rotina.duracaoBloco, restante);
    horarios.push({ inicio, fim: inicio + duracao });
    restante -= duracao;
    inicio += duracao + rotina.pausa;
  }
  return horarios;
}

/** Blocos que faltam no tópico: o status já cumprido desconta do total. */
export function blocosRestantes(
  status: StatusTopico,
  dificuldade: Dificuldade,
): number {
  const total = BLOCOS_POR_TOPICO[dificuldade];
  // O epsilon evita que 3 × (1 − 1/3) vire 2,0000001 e arredonde para 3.
  return Math.max(0, Math.ceil(total * (1 - VALOR_STATUS[status]) - 1e-9));
}

type Pendente = Omit<BlocoAgenda, keyof Horario>;

function filaDaMateria(materia: MateriaAgenda): Pendente[] {
  return [...materia.topicos]
    .sort((a, b) => a.ordem - b.ordem)
    .flatMap((topico) => {
      const dificuldade = topico.dificuldade ?? materia.dificuldade;
      const partes = BLOCOS_POR_TOPICO[dificuldade];
      const restantes = blocosRestantes(topico.status, dificuldade);
      return Array.from({ length: restantes }, (_, i) => ({
        materiaId: materia.id,
        materiaNome: materia.nome,
        topicoId: topico.id,
        topicoTitulo: topico.titulo,
        parte: partes - restantes + i + 1,
        partes,
      }));
    });
}

/**
 * Distribui os tópicos pendentes nos horários da rotina, a partir de `hoje`.
 *
 * Cada bloco é de uma matéria só, e blocos seguidos são de matérias
 * diferentes sempre que possível. As matérias se revezam proporcionalmente a
 * peso × dificuldade (as mais pesadas e difíceis aparecem mais vezes); dentro
 * de cada matéria, os tópicos seguem a ordem do edital.
 */
export function gerarAgenda({
  rotina,
  materias,
  hoje,
  dataProva = null,
  janela = 14,
}: {
  rotina: RotinaAgenda;
  materias: MateriaAgenda[];
  /** `AAAA-MM-DD`. */
  hoje: string;
  dataProva?: Date | null;
  /** Quantos dias corridos, a partir de hoje, entram em `dias`. */
  janela?: number;
}): Agenda {
  const estados = materias
    .map((materia) => ({
      materia,
      fila: filaDaMateria(materia),
      proximo: 0,
      passe: 0,
      passada: 1 / (materia.peso * FATOR_DIFICULDADE[materia.dificuldade]),
    }))
    .filter((e) => e.fila.length > 0);
  const blocosPendentes = estados.reduce((soma, e) => soma + e.fila.length, 0);

  const horarios = horariosDoDia(rotina);
  const diasSemana = new Set(rotina.diasSemana);
  const prova = dataProva ? dataParaIso(dataProva) : null;
  const inicio = isoParaData(hoje).getTime();

  const dias: DiaAgenda[] = [];
  let alocados = 0;
  let antesDaProva = 0;
  let termino: string | null = null;

  for (
    let i = 0;
    i < MAX_DIAS && alocados < blocosPendentes && horarios.length > 0;
    i++
  ) {
    const dia = new Date(inicio + i * DIA_MS);
    if (!diasSemana.has(dia.getUTCDay())) continue;
    const data = dataParaIso(dia);

    const blocos: BlocoAgenda[] = [];
    let anterior: string | null = null;
    for (const horario of horarios) {
      const ativos = estados.filter((e) => e.proximo < e.fila.length);
      if (ativos.length === 0) break;
      const candidatos =
        ativos.length > 1
          ? ativos.filter((e) => e.materia.id !== anterior)
          : ativos;
      const escolhido = candidatos.reduce((melhor, e) =>
        compararEstados(e, melhor) < 0 ? e : melhor,
      );
      blocos.push({ ...horario, ...escolhido.fila[escolhido.proximo] });
      escolhido.proximo++;
      escolhido.passe += escolhido.passada;
      anterior = escolhido.materia.id;
    }

    alocados += blocos.length;
    termino = data;
    const cabeAntesDaProva = prova === null || data < prova;
    if (cabeAntesDaProva) antesDaProva += blocos.length;
    if (i < janela && cabeAntesDaProva) dias.push({ data, blocos });
  }

  return {
    dias,
    blocosPendentes,
    termino: alocados === blocosPendentes ? termino : null,
    blocosSemTempo: prova === null ? 0 : blocosPendentes - antesDaProva,
  };
}

type Estado = { materia: MateriaAgenda; passe: number };

/** Menor passe primeiro; empate: prioridade, peso e ordem do edital. */
function compararEstados(a: Estado, b: Estado): number {
  return (
    a.passe - b.passe ||
    PESO_PRIORIDADE[b.materia.prioridade] -
      PESO_PRIORIDADE[a.materia.prioridade] ||
    b.materia.peso - a.materia.peso ||
    a.materia.ordem - b.materia.ordem
  );
}

/** `14:00`. */
export function formatarHora(minutos: number): string {
  const h = Math.floor(minutos / 60) % 24;
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** `45 min`, `1h`, `1h30`. */
export function formatarDuracao(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}
