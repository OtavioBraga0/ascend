"use client";

import { ChevronDown, Link2, Search, StickyNote, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useOptimistic, useState, useTransition } from "react";

import { StatusMenu } from "@/components/edital/status-menu";
import { TopicoSheet } from "@/components/edital/topico-sheet";
import { Input } from "@/components/ui/input";
import { filtrarEdital } from "@/lib/filtro-edital";
import {
  contarRevisados,
  emPercentual,
  progressoMateria,
} from "@/lib/progresso";
import { STATUS_INFO, STATUS_ORDEM, type StatusTopico } from "@/lib/status";
import { chamarAction } from "@/lib/chamar-action";
import { cn } from "@/lib/utils";
import { alterarStatus } from "@/server/actions/topicos";
import type { MateriaEdital, TopicoEdital } from "@/server/data/topicos";

type MudancaStatus = { topicoId: string; status: StatusTopico };

function aplicarStatus(
  materias: MateriaEdital[],
  { topicoId, status }: MudancaStatus,
) {
  return materias.map((m) => ({
    ...m,
    topicos: m.topicos.map((t) => (t.id === topicoId ? { ...t, status } : t)),
  }));
}

export function EditalLista({ materias }: { materias: MateriaEdital[] }) {
  // Status trocado aparece na hora; se o servidor falhar, volta ao valor anterior.
  const [otimista, mudarOtimista] = useOptimistic(materias, aplicarStatus);
  const [, startTransition] = useTransition();
  const [erro, setErro] = useState<string>();
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<StatusTopico | null>(null);
  const [abertas, setAbertas] = useState<Set<string>>(new Set());
  const [aberto, setAberto] = useState<{
    topicoId: string;
    materiaId: string;
  } | null>(null);

  // Link direto para uma matéria (?materia=<id>), usado pelo painel. Lido a cada
  // navegação, já que a tela pode voltar do cache sem remontar.
  const materiaDestino = useSearchParams().get("materia");
  const [destinoAnterior, setDestinoAnterior] = useState<string | null>(null);
  if (materiaDestino !== destinoAnterior) {
    setDestinoAnterior(materiaDestino);
    if (materiaDestino)
      setAbertas((atual) => new Set(atual).add(materiaDestino));
  }
  useEffect(() => {
    if (!materiaDestino) return;
    requestAnimationFrame(() =>
      document.getElementById(`materia-${materiaDestino}`)?.scrollIntoView(),
    );
  }, [materiaDestino]);

  useEffect(() => {
    if (!erro) return;
    const timer = setTimeout(() => setErro(undefined), 5000);
    return () => clearTimeout(timer);
  }, [erro]);

  function mudarStatus(topicoId: string, status: StatusTopico) {
    setErro(undefined);
    startTransition(async () => {
      mudarOtimista({ topicoId, status });
      const resultado = await chamarAction(() =>
        alterarStatus(topicoId, status),
      );
      if (resultado.error)
        setErro(`${resultado.error} O status voltou ao anterior.`);
    });
  }

  function alternar(materiaId: string) {
    setAbertas((atual) => {
      const novas = new Set(atual);
      if (!novas.delete(materiaId)) novas.add(materiaId);
      return novas;
    });
  }

  const filtrando = busca.trim() !== "" || filtroStatus !== null;
  const visiveis = filtrarEdital(otimista, { busca, status: filtroStatus });
  const totalVisiveis = visiveis.reduce(
    (total, m) => total + m.topicos.length,
    0,
  );
  const todos = otimista.flatMap((m) => m.topicos);

  const materiaAberta = aberto
    ? otimista.find((m) => m.id === aberto.materiaId)
    : undefined;
  const topicoAberto =
    materiaAberta?.topicos.find((t) => t.id === aberto?.topicoId) ?? null;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar tópico ou matéria"
            aria-label="Buscar tópico ou matéria"
            className="h-11 pr-10 pl-9 text-base md:text-sm [&::-webkit-search-cancel-button]:hidden"
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca("")}
              aria-label="Limpar busca"
              className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </div>

        <div
          role="group"
          aria-label="Filtrar por status"
          className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1"
        >
          <FiltroChip
            ativo={filtroStatus === null}
            onClick={() => setFiltroStatus(null)}
          >
            Todos · {todos.length}
          </FiltroChip>
          {STATUS_ORDEM.map((status) => (
            <FiltroChip
              key={status}
              ativo={filtroStatus === status}
              onClick={() =>
                setFiltroStatus(filtroStatus === status ? null : status)
              }
            >
              <span
                className={cn("size-2 rounded-full", STATUS_INFO[status].ponto)}
                aria-hidden
              />
              {STATUS_INFO[status].label} ·{" "}
              {todos.filter((t) => t.status === status).length}
            </FiltroChip>
          ))}
        </div>
      </div>

      <p
        role="status"
        className={cn("text-sm text-muted-foreground", !filtrando && "sr-only")}
      >
        {filtrando &&
          (totalVisiveis === 0
            ? "Nenhum tópico encontrado."
            : `${totalVisiveis} ${totalVisiveis === 1 ? "tópico encontrado" : "tópicos encontrados"}.`)}
      </p>

      <ul className="space-y-3">
        {visiveis.map((materia) => {
          // Com busca ou filtro ativo, as matérias com resultado ficam abertas.
          const expandida = filtrando || abertas.has(materia.id);
          const completa = otimista.find((m) => m.id === materia.id) ?? materia;
          return (
            <li
              key={materia.id}
              id={`materia-${materia.id}`}
              className="scroll-mt-20 rounded-xl border bg-card"
            >
              <MateriaCabecalho
                materia={completa}
                expandida={expandida}
                onAlternar={() => alternar(materia.id)}
                desabilitado={filtrando}
              />
              {expandida && (
                <ul id={`topicos-${materia.id}`} className="divide-y border-t">
                  {materia.topicos.map((topico) => (
                    <TopicoLinha
                      key={topico.id}
                      topico={topico}
                      onAbrir={() =>
                        setAberto({
                          topicoId: topico.id,
                          materiaId: materia.id,
                        })
                      }
                      onMudarStatus={(status) => mudarStatus(topico.id, status)}
                    />
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {erro && (
        <div
          role="alert"
          className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 rounded-lg bg-destructive px-4 py-3 text-sm text-white shadow-lg md:right-8 md:bottom-8 md:left-auto md:max-w-sm"
        >
          {erro}
        </div>
      )}

      <TopicoSheet
        topico={topicoAberto}
        materiaNome={materiaAberta?.nome ?? ""}
        onFechar={() => setAberto(null)}
      />
    </div>
  );
}

function FiltroChip({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      className={cn(
        "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        ativo
          ? "border-primary bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function MateriaCabecalho({
  materia,
  expandida,
  onAlternar,
  desabilitado,
}: {
  materia: MateriaEdital;
  expandida: boolean;
  onAlternar: () => void;
  desabilitado: boolean;
}) {
  const total = materia.topicos.length;
  const revisados = contarRevisados(materia.topicos);
  const percentual = emPercentual(progressoMateria(materia.topicos));

  return (
    <button
      type="button"
      onClick={onAlternar}
      disabled={desabilitado}
      aria-expanded={expandida}
      aria-controls={`topicos-${materia.id}`}
      className="flex w-full flex-col gap-2 rounded-xl p-4 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default"
    >
      <span className="flex w-full items-start gap-2">
        <span className="min-w-0 flex-1 font-medium">{materia.nome}</span>
        <span className="shrink-0 text-sm font-medium tabular-nums">
          {percentual}%
        </span>
        <ChevronDown
          className={cn(
            "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform",
            expandida && "rotate-180",
          )}
          aria-hidden
        />
      </span>
      <BarraStatus topicos={materia.topicos} />
      <span className="text-xs text-muted-foreground">
        {revisados} de {total}{" "}
        {total === 1 ? "tópico revisado" : "tópicos revisados"}
      </span>
    </button>
  );
}

/** Barra empilhada com a proporção de tópicos em cada status. */
function BarraStatus({ topicos }: { topicos: TopicoEdital[] }) {
  const total = topicos.length || 1;
  return (
    <span
      className="flex h-2 w-full overflow-hidden rounded-full bg-muted"
      aria-hidden
    >
      {[...STATUS_ORDEM].reverse().map((status) => {
        const quantidade = topicos.filter((t) => t.status === status).length;
        if (status === "NAO_INICIADO" || quantidade === 0) return null;
        return (
          <span
            key={status}
            className={STATUS_INFO[status].barra}
            style={{ width: `${(quantidade / total) * 100}%` }}
          />
        );
      })}
    </span>
  );
}

function TopicoLinha({
  topico,
  onAbrir,
  onMudarStatus,
}: {
  topico: TopicoEdital;
  onAbrir: () => void;
  onMudarStatus: (status: StatusTopico) => void;
}) {
  return (
    <li className="flex items-center gap-2 py-1 pr-3 pl-1">
      <button
        type="button"
        onClick={onAbrir}
        className="flex min-w-0 flex-1 flex-col gap-1 rounded-md px-3 py-2 text-left text-sm outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="break-words">{topico.titulo}</span>
        {(topico.nota || topico.links.length > 0) && (
          <span className="flex items-center gap-3 text-xs text-muted-foreground">
            {topico.nota && (
              <span className="flex items-center gap-1">
                <StickyNote className="size-3.5" aria-hidden />
                Anotação
              </span>
            )}
            {topico.links.length > 0 && (
              <span className="flex items-center gap-1">
                <Link2 className="size-3.5" aria-hidden />
                {topico.links.length}{" "}
                {topico.links.length === 1 ? "link" : "links"}
              </span>
            )}
          </span>
        )}
      </button>
      <StatusMenu
        status={topico.status}
        titulo={topico.titulo}
        onChange={onMudarStatus}
      />
    </li>
  );
}
