"use client";

import { ExternalLink, Plus, X } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { STATUS_INFO, STATUS_ORDEM, type StatusTopico } from "@/lib/status";
import { chamarAction } from "@/lib/chamar-action";
import { cn } from "@/lib/utils";
import { MAX_LINKS, MAX_NOTA, normalizarLink } from "@/lib/validacao/topico";
import { salvarDetalhes } from "@/server/actions/topicos";
import type { TopicoEdital } from "@/server/data/topicos";

type Props = {
  topico: TopicoEdital | null;
  materiaNome: string;
  onFechar: () => void;
};

/** Bottom sheet com status, anotações e links do tópico. */
export function TopicoSheet({ topico, materiaNome, onFechar }: Props) {
  return (
    <Sheet open={!!topico} onOpenChange={(aberto) => !aberto && onFechar()}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[90dvh] w-full max-w-2xl gap-0 overflow-y-auto rounded-t-2xl pb-[env(safe-area-inset-bottom)]"
      >
        {/* A key reinicia o formulário a cada tópico aberto. */}
        {topico && (
          <DetalhesForm
            key={topico.id}
            topico={topico}
            materiaNome={materiaNome}
            onFechar={onFechar}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function DetalhesForm({
  topico,
  materiaNome,
  onFechar,
}: {
  topico: TopicoEdital;
  materiaNome: string;
  onFechar: () => void;
}) {
  const [status, setStatus] = useState<StatusTopico>(topico.status);
  const [nota, setNota] = useState(topico.nota ?? "");
  const [links, setLinks] = useState(topico.links);
  const [novoLink, setNovoLink] = useState("");
  const [erro, setErro] = useState<string>();
  const [salvando, startSalvar] = useTransition();

  function adicionarLink(e: React.FormEvent) {
    e.preventDefault();
    const link = novoLink.trim();
    if (!link) return;
    const normalizado = normalizarLink(link);
    if (
      !URL.canParse(normalizado) ||
      !/^https?:$/.test(new URL(normalizado).protocol)
    ) {
      setErro("Link inválido.");
      return;
    }
    setErro(undefined);
    if (!links.includes(normalizado)) setLinks([...links, normalizado]);
    setNovoLink("");
  }

  function salvar() {
    setErro(undefined);
    // Um link digitado e não adicionado também é salvo.
    const pendente = novoLink.trim() ? normalizarLink(novoLink) : null;
    const todosLinks =
      pendente && !links.includes(pendente) ? [...links, pendente] : links;
    startSalvar(async () => {
      const resultado = await chamarAction(() =>
        salvarDetalhes(topico.id, {
          status,
          nota,
          links: todosLinks,
        }),
      );
      if (resultado.error) setErro(resultado.error);
      else onFechar();
    });
  }

  return (
    <>
      <SheetHeader className="pr-12">
        <SheetDescription>{materiaNome}</SheetDescription>
        <SheetTitle className="text-base leading-snug">
          {topico.titulo}
        </SheetTitle>
      </SheetHeader>

      <div className="space-y-6 px-4 pb-4">
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">Status</legend>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_ORDEM.map((opcao) => (
              <button
                key={opcao}
                type="button"
                aria-pressed={status === opcao}
                onClick={() => setStatus(opcao)}
                className={cn(
                  "flex h-11 items-center gap-2 rounded-lg border px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  status === opcao
                    ? "border-primary bg-muted font-medium"
                    : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "size-2.5 rounded-full",
                    STATUS_INFO[opcao].ponto,
                  )}
                  aria-hidden
                />
                {STATUS_INFO[opcao].label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="nota">Anotações</Label>
          <Textarea
            id="nota"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            maxLength={MAX_NOTA}
            placeholder="Resumo, dúvidas, onde parou…"
            className="max-h-[30dvh] min-h-24 text-base md:text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="novo-link">Links</Label>
          {links.length > 0 && (
            <ul className="space-y-1">
              {links.map((link) => (
                <li
                  key={link}
                  className="flex items-center gap-1 rounded-lg border pl-3 text-sm"
                >
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-w-0 flex-1 items-center gap-2 py-2 underline-offset-4 hover:underline"
                  >
                    <ExternalLink
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <span className="truncate">
                      {link.replace(/^https?:\/\//, "")}
                    </span>
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 shrink-0"
                    aria-label={`Remover link ${link}`}
                    onClick={() => setLinks(links.filter((l) => l !== link))}
                  >
                    <X aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {links.length < MAX_LINKS && (
            <form onSubmit={adicionarLink} noValidate className="flex gap-2">
              <Input
                id="novo-link"
                type="url"
                inputMode="url"
                value={novoLink}
                onChange={(e) => setNovoLink(e.target.value)}
                placeholder="Cole um link de aula, PDF, lei…"
                className="h-10 text-base md:text-sm"
              />
              <Button
                type="submit"
                variant="outline"
                size="icon"
                className="size-10 shrink-0"
                aria-label="Adicionar link"
              >
                <Plus aria-hidden />
              </Button>
            </form>
          )}
        </div>

        {erro && (
          <p role="alert" className="text-sm text-destructive">
            {erro}
          </p>
        )}
      </div>

      <SheetFooter className="sticky bottom-0 flex-row border-t bg-popover">
        <Button
          variant="outline"
          size="lg"
          className="h-11 flex-1"
          onClick={onFechar}
          disabled={salvando}
        >
          Cancelar
        </Button>
        <Button
          size="lg"
          className="h-11 flex-1"
          onClick={salvar}
          disabled={salvando}
        >
          {salvando ? "Salvando…" : "Salvar"}
        </Button>
      </SheetFooter>
    </>
  );
}
