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

/** Passos 2 (colar o conteúdo programático) e 3 (revisar a estrutura). */
export function ImportarEdital({ concursoId }: { concursoId: string }) {
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
    setRevisao(criarRevisao(materias, () => crypto.randomUUID()));
  }

  if (revisao) {
    return (
      <div className="space-y-6">
        <Passos atual={3} />
        <RevisaoEdital
          concursoId={concursoId}
          inicial={revisao}
          onVoltar={() => setRevisao(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Passos atual={2} />
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
        <Button
          variant="outline"
          size="lg"
          className="h-11"
          onClick={() => setRevisao([])}
        >
          Montar manualmente
        </Button>
      </div>
      <p className="text-center text-sm">
        <Link
          href={`/concursos/${concursoId}`}
          className="text-muted-foreground underline-offset-4 hover:underline"
        >
          Pular por enquanto
        </Link>
      </p>
    </div>
  );
}
