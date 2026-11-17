/**
 * Compara a leitura padrão (parser) com a extração por IA em cada fixture de
 * `src/lib/__fixtures__/`. Serve para escolher o modelo e ajustar o prompt.
 *
 *   npm run avaliar:ia                 # todos os fixtures
 *   npm run avaliar:ia -- pdf-baguncado # só os que contêm esse nome
 *
 * Precisa de OPENROUTER_API_KEY e OPENROUTER_MODEL no .env. Chama a API de
 * verdade (gasta créditos) e não grava nada no banco.
 */
import "dotenv/config";

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { chamarOpenRouter, iaDisponivel } from "@/lib/extracao-ia/openrouter";
import { posProcessar } from "@/lib/extracao-ia/pos-processar";
import { montarMensagens } from "@/lib/extracao-ia/prompt";
import { prepararTexto } from "@/lib/extracao-ia/texto";
import { parseEdital, type MateriaParseada } from "@/lib/parser-edital";

const PASTA = join(import.meta.dirname, "../src/lib/__fixtures__");

const contar = (estrutura: MateriaParseada[]) =>
  `${estrutura.length} matérias, ${estrutura.reduce((t, m) => t + m.topicos.length, 0)} tópicos`;

/** "Matéria › tópico" de cada tópico, para comparar os dois lados. */
const itens = (estrutura: MateriaParseada[]) =>
  new Set(estrutura.flatMap((m) => m.topicos.map((t) => `${m.nome} › ${t}`)));

function listar(titulo: string, linhas: string[]) {
  if (linhas.length === 0) return;
  console.log(`  ${titulo} (${linhas.length}):`);
  for (const linha of linhas) console.log(`    - ${linha}`);
}

async function avaliar(arquivo: string) {
  console.log(`\n=== ${arquivo}`);
  const original = readFileSync(join(PASTA, arquivo), "utf8");
  const doParser = parseEdital(original);
  console.log(`  Parser: ${contar(doParser)}`);

  const texto = prepararTexto(original);
  if (!texto.ok) {
    console.log(`  IA: não enviado (${texto.mensagem})`);
    return;
  }

  const inicio = performance.now();
  const chamada = await chamarOpenRouter({
    mensagens: montarMensagens(texto.texto),
  });
  const segundos = ((performance.now() - inicio) / 1000).toFixed(1);
  const uso = chamada.uso
    ? `${chamada.uso.tokensEntrada ?? "?"} tokens de entrada, ${chamada.uso.tokensSaida ?? "?"} de saída, US$ ${chamada.uso.custoUsd ?? "?"}`
    : "uso não informado";

  if (!chamada.ok) {
    console.log(`  IA: erro ${chamada.erro} em ${segundos} s (${uso})`);
    return;
  }

  const resultado = posProcessar(chamada.resposta, texto.texto);
  console.log(
    `  IA (${chamada.modelo}): ${contar(resultado.estrutura)} em ${segundos} s (${uso})`,
  );

  const parser = itens(doParser);
  const ia = itens(resultado.estrutura);
  listar(
    "Só no parser",
    [...parser].filter((i) => !ia.has(i)),
  );
  listar(
    "Só na IA",
    [...ia].filter((i) => !parser.has(i)),
  );
  listar(
    "Não encontrados no texto",
    resultado.topicosNaoEncontrados.map((t) => `${t.materia} › ${t.topico}`),
  );
  listar("Avisos da IA", resultado.avisos);
}

async function main() {
  if (!iaDisponivel()) {
    console.error(
      "Defina OPENROUTER_API_KEY e OPENROUTER_MODEL no .env para rodar a avaliação.",
    );
    process.exit(1);
  }
  const filtro = process.argv[2];
  const arquivos = readdirSync(PASTA)
    .filter((nome) => nome.endsWith(".txt"))
    .filter((nome) => !filtro || nome.includes(filtro))
    .sort();
  console.log(`Modelo: ${process.env.OPENROUTER_MODEL}`);
  // Em sequência, para os tempos medidos não se misturarem.
  for (const arquivo of arquivos) await avaliar(arquivo);
}

void main();
