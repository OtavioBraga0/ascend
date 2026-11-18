"use client";

import { Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { useState, useTransition } from "react";

import { Passos } from "@/components/concursos/passos";
import {
  RevisaoEdital,
  type ExtracaoRevisao,
} from "@/components/edital/revisao-edital";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseEdital } from "@/lib/parser-edital";
import { criarRevisao, type MateriaRevisao } from "@/lib/revisao-edital";
import {
  extrairEditalIaAction,
  type ResultadoExtracaoIa,
} from "@/server/actions/extrair-edital-ia";

const EXEMPLO = `LÍNGUA PORTUGUESA
1. Leitura e interpretação de textos.
2. Ortografia oficial.

NOÇÕES DE DIREITO PENAL
Infração penal; Tipicidade; Ilicitude.`;

const SEM_TOPICOS =
  "Não encontramos tópicos nesse texto. Confira se colou o conteúdo programático.";

const IA_INDISPONIVEL =
  "A extração com IA não está disponível agora. Use “Gerar estrutura”.";

const AVISO_REIMPORTACAO =
  "Salvar substitui a estrutura atual. Matérias e tópicos com o mesmo nome mantêm o progresso; os demais são apagados.";

/**
 * Passos 2 (colar o conteúdo programático) e 3 (revisar a estrutura) do novo
 * concurso, ou a reimportação de um edital já salvo.
 */
export function ImportarEdital({
  concursoId,
  existentes = [],
  iaDisponivel = false,
}: {
  concursoId: string;
  /** Matérias já salvas; se houver, é uma reimportação. */
  existentes?: { id: string; nome: string; peso: number }[];
  /** Mostra o botão "Extrair com IA" (há chave do OpenRouter no servidor). */
  iaDisponivel?: boolean;
}) {
  const reimportacao = existentes.length > 0;
  const [texto, setTexto] = useState("");
  const [revisao, setRevisao] = useState<{
    materias: MateriaRevisao[];
    extracao?: ExtracaoRevisao;
  } | null>(null);
  const [erro, setErro] = useState<string>();
  const [lendoComIa, startLeitura] = useTransition();

  /** Leitura padrão (parser por regras). Devolve `false` se não achou tópicos. */
  function analisar(extracao?: ExtracaoRevisao) {
    const materias = parseEdital(texto);
    if (materias.length === 0) {
      setErro(SEM_TOPICOS);
      return false;
    }
    setErro(undefined);
    setRevisao({
      materias: criarRevisao(materias, () => crypto.randomUUID(), existentes),
      // A origem só importa quando havia a opção da IA.
      extracao:
        extracao ??
        (iaDisponivel
          ? { origem: "padrao", avisos: [], suspeitos: [], usouFallback: false }
          : undefined),
    });
    return true;
  }

  function extrairComIa() {
    setErro(undefined);
    startLeitura(async () => {
      let resultado: ResultadoExtracaoIa | null;
      try {
        resultado = await extrairEditalIaAction({ texto });
      } catch (falha) {
        // Sem conexão ou erro no servidor: cai na leitura padrão.
        unstable_rethrow(falha);
        resultado = null;
      }

      if (resultado?.ok) {
        const materias = criarRevisao(
          resultado.estrutura,
          () => crypto.randomUUID(),
          existentes,
        );
        const naoEncontrados = new Set(
          resultado.topicosNaoEncontrados.map((t) =>
            chave(t.materia, t.topico),
          ),
        );
        setRevisao({
          materias,
          extracao: {
            origem: "ia",
            avisos: resultado.avisos,
            suspeitos: materias.flatMap((m) =>
              m.topicos
                .filter((t) => naoEncontrados.has(chave(m.nome, t.titulo)))
                .map((t) => t.id),
            ),
            usouFallback: false,
          },
        });
        return;
      }

      switch (resultado?.motivo) {
        case "limite":
        case "texto_invalido":
          setErro(resultado.mensagem);
          return;
        case "indisponivel":
          setErro(IA_INDISPONIVEL);
          return;
      }
      if (
        !analisar({
          origem: "padrao",
          avisos: [],
          suspeitos: [],
          usouFallback: true,
        })
      ) {
        setErro(`Não foi possível usar a IA agora. ${SEM_TOPICOS}`);
      }
    });
  }

  if (revisao) {
    return (
      <div className="space-y-6">
        {!reimportacao && <Passos atual={3} />}
        <RevisaoEdital
          concursoId={concursoId}
          inicial={revisao.materias}
          onVoltar={() => setRevisao(null)}
          aviso={reimportacao ? AVISO_REIMPORTACAO : undefined}
          extracao={revisao.extracao}
          naoSalva
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
          disabled={lendoComIa}
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
          onClick={() => analisar()}
          disabled={!texto.trim() || lendoComIa}
        >
          Gerar estrutura
        </Button>
        {iaDisponivel && (
          <Button
            variant="outline"
            size="lg"
            className="h-11 sm:flex-1"
            onClick={extrairComIa}
            disabled={!texto.trim() || lendoComIa}
          >
            {lendoComIa ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <Sparkles aria-hidden />
            )}
            Extrair com IA
          </Button>
        )}
        {!reimportacao && (
          <Button
            variant="outline"
            size="lg"
            className="h-11"
            onClick={() => setRevisao({ materias: [] })}
            disabled={lendoComIa}
          >
            Montar manualmente
          </Button>
        )}
      </div>
      {lendoComIa && (
        <p role="status" className="text-center text-sm text-muted-foreground">
          Lendo o edital… isso pode levar até 2 minutos.
        </p>
      )}
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

/** Identifica um tópico pela matéria e pelo título (os dois são únicos juntos). */
function chave(materia: string, topico: string) {
  return `${materia}\u0000${topico}`;
}
