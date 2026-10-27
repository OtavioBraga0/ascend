"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type Props = {
  valor: string;
  onSalvar: (valor: string) => void;
  /** Rótulo acessível do campo, ex.: "Nome da matéria". */
  rotulo: string;
  editandoInicial?: boolean;
  className?: string;
};

/** Texto que vira campo de edição ao ser tocado. Enter salva, Esc cancela. */
export function TextoEditavel({
  valor,
  onSalvar,
  rotulo,
  editandoInicial,
  className,
}: Props) {
  const [editando, setEditando] = useState(editandoInicial ?? false);
  const [rascunho, setRascunho] = useState(valor);
  const campo = useRef<HTMLTextAreaElement>(null);
  // Evita salvar de novo no blur que acontece ao sair do modo de edição.
  const concluido = useRef(false);

  useEffect(() => {
    if (editando) campo.current?.select();
  }, [editando]);

  function concluir(salvar: boolean) {
    if (concluido.current) return;
    concluido.current = true;
    const texto = rascunho.replace(/\s+/g, " ").trim();
    // Texto vazio não é aceito: volta ao valor anterior.
    if (salvar && texto && texto !== valor) onSalvar(texto);
    setRascunho(valor);
    setEditando(false);
  }

  if (!editando) {
    return (
      <button
        type="button"
        onClick={() => {
          concluido.current = false;
          setRascunho(valor);
          setEditando(true);
        }}
        aria-label={`${rotulo}: ${valor}. Toque para editar`}
        className={cn(
          "min-w-0 flex-1 rounded-md px-1 py-1 text-left break-words outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50",
          className,
        )}
      >
        {valor}
      </button>
    );
  }

  return (
    <textarea
      ref={campo}
      aria-label={rotulo}
      value={rascunho}
      rows={1}
      onChange={(e) => setRascunho(e.target.value)}
      onBlur={() => concluir(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          concluir(true);
        } else if (e.key === "Escape") {
          e.preventDefault();
          concluir(false);
        }
      }}
      className={cn(
        "field-sizing-content min-h-9 min-w-0 flex-1 resize-none rounded-md border border-input bg-background px-1 py-1 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm",
        className,
      )}
    />
  );
}
