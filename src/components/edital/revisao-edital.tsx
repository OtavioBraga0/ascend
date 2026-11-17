"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  Combine,
  GripVertical,
  MoreVertical,
  Pencil,
  Info,
  Plus,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useReducer, useState, useTransition } from "react";

import { TextoEditavel } from "@/components/edital/texto-editavel";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  contarTopicos,
  encontrarTopico,
  PESO_MAX,
  PESO_MIN,
  problemasRevisao,
  revisaoAlterada,
  revisaoReducer,
  type AcaoRevisao,
  type MateriaRevisao,
  type TopicoRevisao,
} from "@/lib/revisao-edital";
import { chamarAction } from "@/lib/chamar-action";
import { cn } from "@/lib/utils";
import { salvarEditalAction } from "@/server/actions/edital";

/** De onde veio a estrutura, quando o usuário podia escolher a IA. */
export type ExtracaoRevisao = {
  origem: "ia" | "padrao";
  /** Observações da IA sobre o texto. */
  avisos: string[];
  /** Ids dos tópicos que a IA devolveu, mas não estão no texto colado. */
  suspeitos: string[];
  /** A IA falhou e a estrutura veio da leitura padrão. */
  usouFallback: boolean;
};

type Props = {
  concursoId: string;
  inicial: MateriaRevisao[];
  onVoltar: () => void;
  /** Aviso sobre o que acontece com o progresso ao salvar (edição/reimportação). */
  aviso?: string;
  extracao?: ExtracaoRevisao;
  /** A estrutura inicial ainda não foi salva (importação): avisa ao sair mesmo sem edição. */
  naoSalva?: boolean;
};

const NAO_ENCONTRADO =
  "Não encontrado exatamente no texto colado. Confira antes de salvar.";

const PESOS = Array.from(
  { length: PESO_MAX - PESO_MIN + 1 },
  (_, i) => PESO_MIN + i,
);

export function RevisaoEdital({
  concursoId,
  inicial,
  onVoltar,
  aviso,
  extracao,
  naoSalva = false,
}: Props) {
  const [materias, aplicar] = useReducer(revisaoReducer, inicial);
  // O destaque de um tópico suspeito some quando ele é editado ou excluído.
  const [suspeitos, setSuspeitos] = useState(
    () => new Set(extracao?.suspeitos),
  );
  function dispatch(acao: AcaoRevisao) {
    if (
      (acao.tipo === "renomearTopico" || acao.tipo === "excluirTopico") &&
      suspeitos.has(acao.topicoId)
    ) {
      setSuspeitos((atual) => {
        const proximo = new Set(atual);
        proximo.delete(acao.topicoId);
        return proximo;
      });
    }
    aplicar(acao);
  }
  // Tópicos removidos junto com a matéria também deixam de contar.
  const suspeitosAtuais = materias.reduce(
    (total, m) => total + m.topicos.filter((t) => suspeitos.has(t.id)).length,
    0,
  );
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [arrastandoId, setArrastandoId] = useState<string | null>(null);
  const [salvando, startSalvar] = useTransition();
  const [erro, setErro] = useState<string>();

  const totalTopicos = contarTopicos(materias);
  const problemas = problemasRevisao(materias);

  // Avisa antes de sair da página só se houver algo não salvo. Durante o
  // salvamento não avisa: a action redireciona ao terminar.
  const pendente =
    !salvando &&
    ((naoSalva && materias.length > 0) || revisaoAlterada(materias, inicial));
  useEffect(() => {
    if (!pendente) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [pendente]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  /** Matéria de um id do drag and drop (tópico ou a própria lista da matéria). */
  function materiaDe(id: string) {
    return (
      materias.find((m) => m.id === id) ??
      encontrarTopico(materias, id)?.materia
    );
  }

  function onDragStart({ active }: DragStartEvent) {
    setArrastandoId(String(active.id));
  }

  // Entre matérias, o tópico muda de lista já durante o arraste.
  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const origem = encontrarTopico(materias, String(active.id));
    const destino = materiaDe(String(over.id));
    if (!origem || !destino || destino.id === origem.materia.id) return;
    const indiceOver = destino.topicos.findIndex((t) => t.id === over.id);
    dispatch({
      tipo: "moverTopico",
      topicoId: origem.topico.id,
      paraMateriaId: destino.id,
      indice: indiceOver >= 0 ? indiceOver : destino.topicos.length,
    });
  }

  // Dentro da mesma matéria, reordena ao soltar.
  function onDragEnd({ active, over }: DragEndEvent) {
    setArrastandoId(null);
    if (!over) return;
    const origem = encontrarTopico(materias, String(active.id));
    if (!origem || materiaDe(String(over.id))?.id !== origem.materia.id) return;
    const indice = origem.materia.topicos.findIndex((t) => t.id === over.id);
    if (indice >= 0 && indice !== origem.indice) {
      dispatch({
        tipo: "moverTopico",
        topicoId: origem.topico.id,
        paraMateriaId: origem.materia.id,
        indice,
      });
    }
  }

  function adicionarMateria() {
    const id = crypto.randomUUID();
    dispatch({ tipo: "adicionarMateria", id, nome: "Nova matéria" });
    setEditandoId(id);
  }

  function salvar() {
    setErro(undefined);
    startSalvar(async () => {
      // Os ids permitem ao servidor manter o progresso dos itens já salvos.
      const payload = materias.map((m) => ({
        id: m.id,
        nome: m.nome,
        peso: m.peso,
        topicos: m.topicos.map((t) => ({ id: t.id, titulo: t.titulo })),
      }));
      const resultado = await chamarAction(() =>
        salvarEditalAction(concursoId, payload),
      );
      if (resultado?.error) setErro(resultado.error);
    });
  }

  const arrastando = arrastandoId
    ? encontrarTopico(materias, arrastandoId)?.topico
    : null;

  return (
    <div className="space-y-4 pb-28">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          Confira a estrutura gerada. Toque num texto para editar, arraste pela
          alça{" "}
          <GripVertical
            className="inline size-4 align-text-bottom"
            aria-label="alça"
          />{" "}
          ou use o menu{" "}
          <MoreVertical
            className="inline size-4 align-text-bottom"
            aria-label="menu"
          />{" "}
          para mover tópicos.
        </p>
        {aviso && (
          <p className="rounded-lg bg-muted px-3 py-2 text-sm">{aviso}</p>
        )}
        {extracao && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {extracao.origem === "ia" && (
              <Sparkles className="size-3.5" aria-hidden />
            )}
            {extracao.origem === "ia"
              ? "Estrutura extraída com IA"
              : "Leitura padrão"}
          </p>
        )}
        {extracao?.usouFallback && (
          <p
            role="status"
            className="flex gap-2 rounded-lg border border-destructive/30 px-3 py-2 text-sm"
          >
            <TriangleAlert
              className="mt-0.5 size-4 shrink-0 text-destructive"
              aria-hidden
            />
            Não foi possível usar a IA agora. Usamos a leitura padrão. Confira a
            estrutura.
          </p>
        )}
        {suspeitosAtuais > 0 && (
          <p
            role="status"
            className="flex gap-2 rounded-lg border border-destructive/30 px-3 py-2 text-sm"
          >
            <TriangleAlert
              className="mt-0.5 size-4 shrink-0 text-destructive"
              aria-hidden
            />
            {suspeitosAtuais === 1
              ? "1 tópico não foi encontrado exatamente no texto colado. Confira antes de salvar."
              : `${suspeitosAtuais} tópicos não foram encontrados exatamente no texto colado. Confira antes de salvar.`}
          </p>
        )}
        {extracao && extracao.avisos.length > 0 && (
          <div className="flex gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            <ul className="space-y-1">
              {extracao.avisos.map((avisoIa, i) => (
                <li key={i}>{avisoIa}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => setArrastandoId(null)}
        accessibility={{
          announcements: anuncios(materias),
          screenReaderInstructions,
        }}
      >
        <ol className="space-y-4">
          {materias.map((materia) => (
            <MateriaCard
              key={materia.id}
              materia={materia}
              materias={materias}
              dispatch={dispatch}
              editandoNome={editandoId === materia.id}
              suspeitos={suspeitos}
            />
          ))}
        </ol>
        <DragOverlay>
          {arrastando && (
            <div className="flex items-center gap-2 rounded-lg border bg-background px-2 py-2 text-sm shadow-lg">
              <GripVertical
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              {arrastando.titulo}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <Button
        variant="outline"
        size="lg"
        className="h-11 w-full"
        onClick={adicionarMateria}
      >
        <Plus aria-hidden />
        Adicionar matéria
      </Button>

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t bg-background/95 backdrop-blur md:bottom-0 md:left-60">
        <div className="mx-auto max-w-3xl space-y-2 px-4 py-3">
          {(erro || problemas.length > 0) && (
            <p role="alert" className="text-sm text-destructive">
              {erro ?? problemas[0]}
            </p>
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="h-11"
              onClick={onVoltar}
              disabled={salvando}
            >
              Voltar
            </Button>
            <Button
              size="lg"
              className="h-11 flex-1"
              onClick={salvar}
              disabled={salvando || problemas.length > 0}
            >
              {salvando
                ? "Salvando…"
                : `Salvar edital · ${materias.length} ${materias.length === 1 ? "matéria" : "matérias"}, ${totalTopicos} ${totalTopicos === 1 ? "tópico" : "tópicos"}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MateriaCard({
  materia,
  materias,
  dispatch,
  editandoNome,
  suspeitos,
}: {
  materia: MateriaRevisao;
  materias: MateriaRevisao[];
  dispatch: (acao: AcaoRevisao) => void;
  editandoNome: boolean;
  suspeitos: Set<string>;
}) {
  const { setNodeRef } = useDroppable({ id: materia.id });
  const [novoTopico, setNovoTopico] = useState("");
  const [renomeando, setRenomeando] = useState(0);
  const outras = materias.filter((m) => m.id !== materia.id);
  const pesoId = `peso-${materia.id}`;

  function adicionarTopico(e: React.FormEvent) {
    e.preventDefault();
    const titulo = novoTopico.replace(/\s+/g, " ").trim();
    if (!titulo) return;
    dispatch({
      tipo: "adicionarTopico",
      materiaId: materia.id,
      id: crypto.randomUUID(),
      titulo,
    });
    setNovoTopico("");
  }

  return (
    <li className="rounded-xl border bg-card">
      <div className="flex items-start gap-1 border-b p-2">
        <TextoEditavel
          // Remonta em modo de edição quando "Renomear" é escolhido no menu.
          key={renomeando}
          valor={materia.nome}
          rotulo="Nome da matéria"
          editandoInicial={editandoNome || renomeando > 0}
          onSalvar={(nome) =>
            dispatch({ tipo: "renomearMateria", materiaId: materia.id, nome })
          }
          className="font-medium"
        />
        <label htmlFor={pesoId} className="sr-only">
          Peso da matéria {materia.nome}
        </label>
        <select
          id={pesoId}
          value={materia.peso}
          onChange={(e) =>
            dispatch({
              tipo: "definirPeso",
              materiaId: materia.id,
              peso: Number(e.target.value),
            })
          }
          className="h-9 shrink-0 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {PESOS.map((peso) => (
            <option key={peso} value={peso}>
              Peso {peso}
            </option>
          ))}
        </select>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="size-9 shrink-0" />
            }
            aria-label={`Ações da matéria ${materia.nome}`}
          >
            <MoreVertical aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuItem onClick={() => setRenomeando((n) => n + 1)}>
              <Pencil aria-hidden />
              Renomear
            </DropdownMenuItem>
            {outras.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Mesclar com…</DropdownMenuLabel>
                  {outras.map((outra) => (
                    <DropdownMenuItem
                      key={outra.id}
                      onClick={() =>
                        dispatch({
                          tipo: "mesclarMaterias",
                          origemId: materia.id,
                          destinoId: outra.id,
                        })
                      }
                    >
                      <Combine aria-hidden />
                      <span className="truncate">{outra.nome}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() =>
                dispatch({ tipo: "excluirMateria", materiaId: materia.id })
              }
            >
              <Trash2 aria-hidden />
              Excluir matéria
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SortableContext
        items={materia.topicos.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul
          ref={setNodeRef}
          className="min-h-10 space-y-0.5 p-1"
          aria-label={`Tópicos de ${materia.nome}`}
        >
          {materia.topicos.length === 0 && (
            <li className="px-2 py-2 text-sm text-muted-foreground">
              Nenhum tópico. Arraste um tópico para cá ou adicione abaixo.
            </li>
          )}
          {materia.topicos.map((topico, indice) => (
            <TopicoItem
              key={topico.id}
              topico={topico}
              materia={materia}
              indice={indice}
              outras={outras}
              dispatch={dispatch}
              suspeito={suspeitos.has(topico.id)}
            />
          ))}
        </ul>
      </SortableContext>

      <form onSubmit={adicionarTopico} className="flex gap-2 border-t p-2">
        <Input
          value={novoTopico}
          onChange={(e) => setNovoTopico(e.target.value)}
          placeholder="Adicionar tópico"
          aria-label={`Novo tópico em ${materia.nome}`}
          className="h-9 text-base md:text-sm"
        />
        <Button
          type="submit"
          variant="outline"
          size="icon"
          className="size-9 shrink-0"
          aria-label="Adicionar tópico"
        >
          <Plus aria-hidden />
        </Button>
      </form>
    </li>
  );
}

function TopicoItem({
  topico,
  materia,
  indice,
  outras,
  dispatch,
  suspeito,
}: {
  topico: TopicoRevisao;
  materia: MateriaRevisao;
  indice: number;
  outras: MateriaRevisao[];
  dispatch: (acao: AcaoRevisao) => void;
  suspeito: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: topico.id });
  const [renomeando, setRenomeando] = useState(0);

  const mover = (paraMateriaId: string, novoIndice: number) =>
    dispatch({
      tipo: "moverTopico",
      topicoId: topico.id,
      paraMateriaId,
      indice: novoIndice,
    });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-start gap-1 rounded-lg bg-card text-sm",
        suspeito && "bg-destructive/5 ring-1 ring-destructive/40",
        isDragging && "opacity-40",
      )}
      title={suspeito ? NAO_ENCONTRADO : undefined}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={`Arrastar tópico ${topico.titulo}`}
        className="flex size-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" aria-hidden />
      </button>
      <TextoEditavel
        key={renomeando}
        valor={topico.titulo}
        rotulo="Tópico"
        editandoInicial={renomeando > 0}
        onSalvar={(titulo) =>
          dispatch({ tipo: "renomearTopico", topicoId: topico.id, titulo })
        }
        className="py-2"
      />
      {suspeito && (
        <span className="flex size-9 shrink-0 items-center justify-center">
          <TriangleAlert
            className="size-4 text-destructive"
            role="img"
            aria-label={NAO_ENCONTRADO}
          />
        </span>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" className="size-9 shrink-0" />
          }
          aria-label={`Ações do tópico ${topico.titulo}`}
        >
          <MoreVertical aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuItem onClick={() => setRenomeando((n) => n + 1)}>
            <Pencil aria-hidden />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={indice === 0}
            onClick={() => mover(materia.id, indice - 1)}
          >
            <ArrowUp aria-hidden />
            Mover para cima
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={indice === materia.topicos.length - 1}
            onClick={() => mover(materia.id, indice + 1)}
          >
            <ArrowDown aria-hidden />
            Mover para baixo
          </DropdownMenuItem>
          {outras.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Mover para…</DropdownMenuLabel>
                {outras.map((outra) => (
                  <DropdownMenuItem
                    key={outra.id}
                    onClick={() => mover(outra.id, outra.topicos.length)}
                  >
                    <span className="truncate">{outra.nome}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() =>
              dispatch({ tipo: "excluirTopico", topicoId: topico.id })
            }
          >
            <Trash2 aria-hidden />
            Excluir tópico
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

const screenReaderInstructions = {
  draggable:
    "Para mover o tópico, pressione espaço ou Enter. Use as setas para mudar de posição e espaço ou Enter para soltar. Esc cancela.",
};

function anuncios(materias: MateriaRevisao[]): Announcements {
  const descrever = (id: string | number | undefined) => {
    const achado =
      id === undefined ? null : encontrarTopico(materias, String(id));
    return achado
      ? `posição ${achado.indice + 1} de ${achado.materia.nome}`
      : "fora da lista";
  };
  const titulo = (id: string | number) =>
    encontrarTopico(materias, String(id))?.topico.titulo ?? "tópico";
  return {
    onDragStart: ({ active }) => `Movendo "${titulo(active.id)}".`,
    onDragOver: ({ active, over }) =>
      `"${titulo(active.id)}" em ${descrever(over?.id)}.`,
    onDragEnd: ({ active }) =>
      `"${titulo(active.id)}" solto em ${descrever(active.id)}.`,
    onDragCancel: ({ active }) =>
      `Movimento de "${titulo(active.id)}" cancelado.`,
  };
}
