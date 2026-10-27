export type MateriaParseada = { nome: string; topicos: string[] };

export const SEM_MATERIA = "Sem matéria";

const BULLET = /^[•·▪●◦○■□*\-–—]\s*/;

/** Numeração no início de um item: `1.`, `1.1`, `1)`, `1 -`, `a)`, `I -`. */
const NUMERACAO =
  /^(?:\d{1,2}(?:\.\d{1,2}){0,3}\s*[.)\-–]?|[a-z]\)|[IVXL]{1,5}\s*[.)\-–])\s+(?=\S)/u;

/** Início de um novo item numerado no meio da linha (após `.`, `;` ou `:`). */
const NUMERACAO_NO_MEIO =
  /(?<=[.;:])\s+(?=\d{1,2}(?:\.\d{1,2}){0,3}[.)]?\s*[-–]?\s+\p{Lu}|[a-z]\)\s+\p{L}|[IVXL]{1,5}\s*[.)\-–]\s+\p{Lu})/u;

/** Fim de frase seguido de nova frase (texto corrido). */
const FIM_DE_FRASE = /(?<=\.)\s+(?=["“(]?\p{Lu})/u;

/** Abreviações cujo ponto não encerra o tópico (ex.: "art. 5º"). */
const ABREVIACOES =
  /\b(arts?|incs?|dr|dra|sr|sra|prof|profa|ex|cap|vol|pág|p)\.(?=\s)/giu;
const PONTO_PROTEGIDO = "\u0000";

const MATERIA_CONHECIDA =
  /^(noções|conhecimentos|língua|direito|legislação|matemática|raciocínio|informática|atualidades|administração|contabilidade|economia|estatística|arquivologia|ética|redação|literatura|história|geografia|inglês|espanhol|física|química|biologia)\b/iu;

const CONECTORES = new Set([
  "a",
  "à",
  "às",
  "ao",
  "aos",
  "as",
  "com",
  "da",
  "das",
  "de",
  "do",
  "dos",
  "e",
  "em",
  "na",
  "nas",
  "no",
  "nos",
  "o",
  "os",
  "ou",
  "para",
  "pela",
  "pelas",
  "pelo",
  "pelos",
  "por",
  "sobre",
  "nº",
  "n.º",
]);

/** Linhas de cabeçalho em caixa alta deixam de valer se forem a maioria do texto. */
const MAX_PROPORCAO_CAIXA_ALTA = 0.6;
const MAX_TAMANHO_CABECALHO = 80;

export function parseEdital(texto: string): MateriaParseada[] {
  const linhas = normalizar(texto);
  const capsAtivo = proporcaoCaixaAlta(linhas) <= MAX_PROPORCAO_CAIXA_ALTA;

  const grupos: { nome: string; linhas: string[] }[] = [
    { nome: SEM_MATERIA, linhas: [] },
  ];
  let atual = grupos[0];
  let ultimaFoiCabecalho = false;

  for (const linha of linhas) {
    const cabecalho = detectarCabecalho(linha, capsAtivo);

    if (cabecalho) {
      // Cabeçalho quebrado em duas linhas: "DIREITO ADMINISTRATIVO E" + "LEGISLAÇÃO".
      if (
        ultimaFoiCabecalho &&
        !cabecalho.resto &&
        terminaComConector(atual.nome)
      ) {
        atual.nome = `${atual.nome} ${cabecalho.nome}`;
        continue;
      }
      atual = {
        nome: cabecalho.nome,
        linhas: cabecalho.resto ? [cabecalho.resto] : [],
      };
      grupos.push(atual);
      ultimaFoiCabecalho = !cabecalho.resto;
      continue;
    }

    const anterior = atual.linhas.at(-1);
    if (
      anterior !== undefined &&
      !ultimaFoiCabecalho &&
      ehContinuacao(anterior, linha)
    ) {
      atual.linhas[atual.linhas.length - 1] = juntar(anterior, linha);
    } else {
      atual.linhas.push(linha);
    }
    ultimaFoiCabecalho = false;
  }

  return grupos
    .map((grupo) => ({
      nome: grupo.nome,
      topicos: extrairTopicos(grupo.linhas),
    }))
    .filter((materia) => materia.topicos.length > 0);
}

function normalizar(texto: string): string[] {
  return texto
    .replace(/\r\n?/g, "\n")
    .replace(/[\t   ]/g, " ")
    .replace(/(\p{L})-\n *(\p{Ll})/gu, "$1$2") // hifenização de quebra de linha
    .split("\n")
    .map((linha) => linha.replace(/ {2,}/g, " ").trim())
    .filter((linha) => linha && !ehNumeroDePagina(linha));
}

function ehNumeroDePagina(linha: string) {
  return (
    /^\d{1,4}$/.test(linha) ||
    /^p[áa]g(ina|\.)?\s*\d+(\s*(de|\/)\s*\d+)?$/iu.test(linha)
  );
}

function semMarcador(linha: string) {
  return linha.replace(BULLET, "").replace(NUMERACAO, "");
}

function ehNumeradaOuMarcada(linha: string) {
  return BULLET.test(linha) || NUMERACAO.test(linha);
}

/** Todas as letras com caixa estão em maiúsculas (ignora números, pontuação e "º"). */
function ehCaixaAlta(texto: string) {
  const letras = (texto.match(/\p{L}/gu) ?? []).filter(
    (l) => l.toLowerCase() !== l.toUpperCase(),
  );
  return letras.length >= 3 && letras.every((l) => l === l.toUpperCase());
}

function ehCabecalhoCaixaAlta(texto: string) {
  return (
    texto.length <= MAX_TAMANHO_CABECALHO &&
    ehCaixaAlta(texto) &&
    !/[.;,]$/.test(texto)
  );
}

function proporcaoCaixaAlta(linhas: string[]) {
  if (linhas.length === 0) return 0;
  return (
    linhas.filter((linha) => ehCabecalhoCaixaAlta(semMarcador(linha))).length /
    linhas.length
  );
}

/** "Noções de Direito Penal", mas não "Direito de propriedade". */
function ehMateriaConhecida(texto: string) {
  if (texto.length > MAX_TAMANHO_CABECALHO || !MATERIA_CONHECIDA.test(texto))
    return false;
  return texto
    .split(/\s+/)
    .filter((palavra) => palavra.replace(/\P{L}/gu, "").length > 3)
    .every((palavra) => {
      const letra = palavra.match(/\p{L}/u)?.[0] ?? "";
      return letra === letra.toUpperCase();
    });
}

function limparNome(nome: string) {
  return nome.replace(/[\s:.\-–]+$/u, "").trim();
}

function detectarCabecalho(
  linha: string,
  capsAtivo: boolean,
): { nome: string; resto: string } | null {
  // "LÍNGUA PORTUGUESA: 1 Compreensão..." ou "Legislação:"
  const comDoisPontos = /^([^:]{3,80}):\s*(.*)$/u.exec(linha);
  if (comDoisPontos && !ehNumeradaOuMarcada(linha)) {
    const nome = limparNome(comDoisPontos[1]);
    const resto = comDoisPontos[2].trim();
    if (
      !resto ||
      (capsAtivo && ehCaixaAlta(nome)) ||
      ehMateriaConhecida(nome)
    ) {
      return { nome, resto };
    }
  }

  const texto = semMarcador(linha);
  if (capsAtivo && ehCabecalhoCaixaAlta(texto)) {
    return { nome: limparNome(texto), resto: "" };
  }
  if (
    !ehNumeradaOuMarcada(linha) &&
    !/[.;,]$/.test(linha) &&
    ehMateriaConhecida(linha)
  ) {
    return { nome: limparNome(linha), resto: "" };
  }
  return null;
}

function terminaComConector(texto: string) {
  if (/[,\-–]$/.test(texto)) return true;
  const ultima = texto.split(/\s+/).at(-1)?.toLowerCase() ?? "";
  return CONECTORES.has(ultima);
}

/** A linha continua a anterior (quebra de linha no meio da frase, comum em PDFs). */
function ehContinuacao(anterior: string, linha: string) {
  if (ehNumeradaOuMarcada(linha)) return false;
  if (/[-(/,]$/.test(anterior)) return true;
  if (/^\p{Ll}/u.test(linha)) return true;
  return terminaComConector(anterior) && !/[.;:]$/.test(anterior);
}

function juntar(anterior: string, linha: string) {
  return /\S-$/.test(anterior) ? anterior + linha : `${anterior} ${linha}`;
}

function extrairTopicos(linhas: string[]): string[] {
  const vistos = new Set<string>();
  const topicos: string[] = [];
  for (const topico of linhas.flatMap(dividirLinha).map(limparTopico)) {
    // Ignora pedaços sem texto (ex.: só a numeração) e duplicados exatos.
    if (!/\p{L}.*\p{L}/u.test(topico) || vistos.has(topico)) continue;
    vistos.add(topico);
    topicos.push(topico);
  }
  return topicos;
}

function dividirLinha(linha: string): string[] {
  const marcada = BULLET.test(linha);
  const pedacos = linha.replace(BULLET, "").split(NUMERACAO_NO_MEIO);
  const numerada = pedacos.some((pedaco) => NUMERACAO.test(pedaco));

  if (!marcada && !numerada) return dividirCorrido(linha);

  // Itens numerados ficam inteiros; só o texto antes do primeiro número é dividido.
  return pedacos.flatMap((pedaco, i) =>
    i === 0 && !marcada && !NUMERACAO.test(pedaco)
      ? dividirCorrido(pedaco)
      : [pedaco],
  );
}

/** Texto corrido: tópicos separados por ";" ou por fim de frase. */
function dividirCorrido(texto: string): string[] {
  return texto
    .replace(ABREVIACOES, `$1${PONTO_PROTEGIDO}`)
    .split(";")
    .flatMap((parte) => parte.split(FIM_DE_FRASE))
    .map((parte) => parte.replaceAll(PONTO_PROTEGIDO, "."));
}

function limparTopico(topico: string) {
  return semMarcador(topico.trim())
    .replace(/\s{2,}/g, " ")
    .replace(/[\s.;,:]+$/u, "")
    .trim();
}
