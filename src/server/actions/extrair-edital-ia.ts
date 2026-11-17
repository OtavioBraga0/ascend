"use server";

import { z } from "zod";

import { mensagemLimite, verificarLimite } from "@/lib/extracao-ia/limite";
import {
  chamarOpenRouter,
  iaDisponivel,
  type ErroOpenRouter,
} from "@/lib/extracao-ia/openrouter";
import {
  posProcessar,
  type TopicoNaoEncontrado,
} from "@/lib/extracao-ia/pos-processar";
import { montarMensagens } from "@/lib/extracao-ia/prompt";
import {
  MAX_CARACTERES,
  MENSAGEM_TEXTO_GRANDE,
  prepararTexto,
} from "@/lib/extracao-ia/texto";
import type { MateriaParseada } from "@/lib/parser-edital";
import { requireUser } from "@/server/auth";
import {
  concluirUso,
  iniciarUso,
  tentativasRecentes,
} from "@/server/data/uso-ia";

export type ResultadoExtracaoIa =
  | {
      ok: true;
      estrutura: MateriaParseada[];
      avisos: string[];
      topicosNaoEncontrados: TopicoNaoEncontrado[];
      modelo: string;
    }
  | {
      ok: false;
      motivo: "indisponivel" | "limite" | "texto_invalido" | ErroOpenRouter;
      /** Para mostrar ao usuário (limite e texto inválido). */
      mensagem?: string;
    };

// O limite real vale depois da normalização; aqui só barra entradas absurdas.
const entradaSchema = z.object({
  texto: z.string().max(MAX_CARACTERES * 2),
});

const TIPO = "extracao_edital";

export async function extrairEditalIaAction(
  entrada: unknown,
): Promise<ResultadoExtracaoIa> {
  const user = await requireUser();
  const parsed = entradaSchema.safeParse(entrada);
  if (!parsed.success) {
    return {
      ok: false,
      motivo: "texto_invalido",
      mensagem: MENSAGEM_TEXTO_GRANDE,
    };
  }
  if (!iaDisponivel()) return { ok: false, motivo: "indisponivel" };

  const texto = prepararTexto(parsed.data.texto);
  if (!texto.ok)
    return { ok: false, motivo: "texto_invalido", mensagem: texto.mensagem };

  const agora = new Date();
  const limite = verificarLimite(
    await tentativasRecentes(user.id, TIPO, agora),
    agora,
  );
  if (!limite.permitido) {
    return {
      ok: false,
      motivo: "limite",
      mensagem: mensagemLimite(limite.liberaEm, agora),
    };
  }

  const usoId = await iniciarUso(user.id, {
    tipo: TIPO,
    caracteres: texto.texto.length,
  });
  const chamada = await chamarOpenRouter({
    mensagens: montarMensagens(texto.texto),
  });
  const resultado = chamada.ok
    ? posProcessar(chamada.resposta, texto.texto)
    : null;
  const erro: ErroOpenRouter | null = !chamada.ok
    ? chamada.erro
    : resultado?.estrutura.length
      ? null
      : "vazio";

  await concluirUso(user.id, usoId, {
    sucesso: erro === null,
    erro,
    modelo: chamada.modelo,
    tokensEntrada: chamada.uso?.tokensEntrada ?? null,
    tokensSaida: chamada.uso?.tokensSaida ?? null,
    custoUsd: chamada.uso?.custoUsd ?? null,
  });

  if (erro || !chamada.ok || !resultado) {
    return { ok: false, motivo: erro ?? "vazio" };
  }
  return { ok: true, ...resultado, modelo: chamada.modelo };
}
