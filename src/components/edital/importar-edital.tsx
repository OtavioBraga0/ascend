"use client";

import Link from "next/link";
import { useState } from "react";

import { Passos } from "@/components/concursos/passos";
import { RevisaoEdital } from "@/components/edital/revisao-edital";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseEdital } from "@/lib/parser-edital";
import { criarRevisao, type MateriaRevisao } from "@/lib/revisao-edital";

const EXEMPLO = `LÍNGUA PORTUGUESA
1. Leitura e interpretação de textos.
2. Ortografia oficial.

NOÇÕES DE DIREITO PENAL
Infração penal; Tipicidade; Ilicitude.`;

const AVISO_REIMPORTACAO =
  "Salvar substitui a estrutura atual. Matérias e tópicos com o mesmo nome mantêm o progresso; os demais são apagados.";

/**
 * Passos 2 (colar o conteúdo programático) e 3 (revisar a estrutura) do novo
 * concurso, ou a reimportação de um edital já salvo.
 */
export function ImportarEdital({
  concursoId,
  existentes = [],
}: {
  concursoId: string;
  /** Matérias já salvas; se houver, é uma reimportação. */
  existentes?: { id: string; nome: string; peso: number }[];
}) {
  const reimportacao = existentes.length > 0;
  const [texto, setTexto] = useState("");
  const [revisao, setRevisao] = useState<MateriaRevisao[] | null>(null);
  const [erro, setErro] = useState<string>();

  function analisar() {
    const materias = parseEdital(texto);
    if (materias.length === 0) {
      setErro(
        "Não encontramos tópicos nesse texto. Confira se colou o conteúdo programático.",
      );
      return;
    }
    setErro(undefined);
    setRevisao(criarRevisao(materias, () => crypto.randomUUID(), existentes));
  }

  if (revisao) {
    return (
      <div className="space-y-6">
        {!reimportacao && <Passos atual={3} />}
        <RevisaoEdital
          concursoId={concursoId}
          inicial={revisao}
          onVoltar={() => setRevisao(null)}
          aviso={reimportacao ? AVISO_REIMPORTACAO : undefined}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {reimportacao ? (
        <p role="note" className="rounded-lg bg-muted px-3 py-2 text-sm">
          {AVISO_REIMPORTACAO} Para só ajustar a estrutura atual, use “Editar
          estrutura” nos ajustes.
        </p>
      ) : (
        <Passos atual={2} />
      )}
      <div className="space-y-2">
        <Label htmlFor="texto-edital">Conteúdo programático</Label>
        <p id="texto-edital-ajuda" className="text-sm text-muted-foreground">
          Copie do edital a parte com as matérias e os tópicos e cole aqui. Na
          próxima etapa você confere e corrige tudo antes de salvar.
        </p>
        <Textarea
          id="texto-edital"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={EXEMPLO}
          aria-describedby={
            erro ? "texto-edital-ajuda texto-edital-erro" : "texto-edital-ajuda"
          }
          aria-invalid={!!erro}
          className="max-h-[50dvh] min-h-60 text-base md:text-sm"
        />
        {erro && (
          <p
            id="texto-edital-erro"
            role="alert"
            className="text-sm text-destructive"
          >
            {erro}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          size="lg"
          className="h-11 sm:flex-1"
          onClick={analisar}
          disabled={!texto.trim()}
        >
          Gerar estrutura
        </Button>
        {!reimportacao && (
          <Button
            variant="outline"
            size="lg"
            className="h-11"
            onClick={() => setRevisao([])}
          >
            Montar manualmente
          </Button>
        )}
      </div>
      <p className="text-center text-sm">
        <Link
          href={
            reimportacao
              ? `/concursos/${concursoId}/configuracoes`
              : `/concursos/${concursoId}`
          }
          className="text-muted-foreground underline-offset-4 hover:underline"
        >
          {reimportacao ? "Cancelar" : "Pular por enquanto"}
        </Link>
      </p>
    </div>
  );
}
