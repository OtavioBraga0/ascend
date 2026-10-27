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
  Plus,
  Trash2,
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
  revisaoReducer,
  type AcaoRevisao,
  type MateriaRevisao,
  type TopicoRevisao,
} from "@/lib/revisao-edital";
import { cn } from "@/lib/utils";
import { salvarEditalAction } from "@/server/actions/edital";

type Props = {
  concursoId: string;
  inicial: MateriaRevisao[];
  onVoltar: () => void;
  /** Aviso sobre o que acontece com o progresso ao salvar (edição/reimportação). */
  aviso?: string;
};

const PESOS = Array.from(
  { length: PESO_MAX - PESO_MIN + 1 },
  (_, i) => PESO_MIN + i,
);

export function RevisaoEdital({ concursoId, inicial, onVoltar, aviso }: Props) {
  const [materias, dispatch] = useReducer(revisaoReducer, inicial);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [arrastandoId, setArrastandoId] = useState<string | null>(null);
  const [salvando, startSalvar] = useTransition();
  const [erro, setErro] = useState<string>();

  const totalTopicos = contarTopicos(materias);
  const problemas = problemasRevisao(materias);

  // Avisa antes de sair da página com a revisão não salva.
  useEffect(() => {
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, []);

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
      const resultado = await salvarEditalAction(concursoId, payload);
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
}: {
  materia: MateriaRevisao;
  materias: MateriaRevisao[];
  dispatch: (acao: AcaoRevisao) => void;
  editandoNome: boolean;
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
}: {
  topico: TopicoRevisao;
  materia: MateriaRevisao;
  indice: number;
  outras: MateriaRevisao[];
  dispatch: (acao: AcaoRevisao) => void;
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
        isDragging && "opacity-40",
      )}
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
