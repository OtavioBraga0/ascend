# Ascend

App de estudos para concursos, mobile first. Você cadastra o concurso, importa o conteúdo programático do edital, marca o status de cada tópico, acompanha o progresso no painel e segue uma agenda de estudos montada a partir da sua rotina. A estrutura de um concurso pode ser compartilhada por link.

Cada usuário só vê os próprios dados.

## Funcionalidades

### Concursos

- Cadastro com nome, banca, cargo, data da prova e cor. O assistente de novo concurso segue os passos: dados → colar o edital → revisar a estrutura → afinidade.
- Em `/concursos`, cada card mostra o anel de progresso, o % e quantos dias faltam para a prova.
- Ajustes do concurso (`/concursos/[id]/configuracoes`): editar dados, definir peso (1 a 5) e prioridade (baixa, média, alta) das matérias, editar a estrutura, reimportar o edital, compartilhar e excluir o concurso.

### Importação do edital

O texto colado passa pelo parser (`src/lib/parser-edital.ts`), que gera a árvore matéria → tópicos:

- normaliza quebras de linha, espaços duplicados e hifenização de PDF, e junta linhas quebradas no meio da frase;
- detecta matéria em linha toda em CAIXA ALTA, terminada em `:` ou com padrões comuns (`NOÇÕES DE ...`, `DIREITO ...`, `LÍNGUA PORTUGUESA`...);
- detecta tópicos numerados (`1.`, `1.1`, `a)`, `I -`, `•`, `-`) ou em texto corrido separado por `;`. Subtópicos viram tópicos próprios (não há hierarquia além de matéria → tópico);
- o que não se encaixa vai para "Sem matéria"; tópicos vazios e duplicados são descartados.
- nomes de matéria em CAIXA ALTA viram Title Case, com conectores em minúsculas ("NOÇÕES DE DIREITO PENAL" → "Noções de Direito Penal"). Siglas comuns (TI, SUS, CF…), numerais romanos e palavras com números ficam como estão. Nomes com maiúsculas e minúsculas não mudam.

Antes de salvar, a tela de revisão permite renomear, excluir, adicionar, mover e reordenar tópicos e matérias, mesclar matérias e definir pesos. Tudo é gravado em uma transação.

#### Extração com IA

Para editais que o parser lê mal (texto bagunçado do PDF, matérias fora de caixa alta, numeração quebrada), há o botão **Extrair com IA**, no passo de colar o edital e na reimportação. Ele só aparece quando `OPENROUTER_API_KEY` está definida. O código fica em `src/lib/extracao-ia/`, e a server action em `src/server/actions/extrair-edital-ia.ts`.

1. O texto passa pela mesma normalização do parser e precisa ter de 50 a 120.000 caracteres.
2. O texto é dividido em partes de até 4.000 caracteres (`dividir.ts`), cortadas de preferência antes do nome de uma matéria. A resposta da IA tem quase o tamanho do texto, então um edital grande numa chamada só estouraria o limite de tokens e o tempo da função. As partes são enviadas ao OpenRouter em paralelo, com saída estruturada (JSON Schema estrito), `temperature: 0` e os modelos reserva, se houver. Cada parte depois da primeira leva o final da anterior como contexto, só para a IA saber qual matéria está em andamento. Uma parte que falha por sobrecarga, erro do provedor ou resposta malformada ou cortada é tentada mais uma vez, com `temperature: 0.3` (com 0, um modelo que entrou em repetição tende a repetir de novo). O limite de 8.000 tokens por parte corta uma repetição cedo, a tempo dessa nova tentativa. O prazo total é de 130 s. O prompt segue as convenções do parser: texto dos tópicos copiado literalmente, subtópicos como tópicos próprios, nome da matéria como está no edital e "Sem matéria" para tópicos soltos. O texto do usuário vai entre `<edital>` e `</edital>` e é tratado como dado, nunca como instrução.
3. Cada resposta é validada de novo com Zod. As partes são juntadas em ordem, e a estrutura só segue se todas derem certo: nunca chega à revisão uma estrutura com pedaços faltando. O resultado é pós-processado com as regras do parser: limpeza, descarte de vazios e duplicados, Title Case nos nomes em caixa alta e junção de matérias com o mesmo nome. O resultado tem o mesmo formato da leitura padrão e vai para a mesma tela de revisão. Daí em diante nada muda: a reimportação preserva o progresso do mesmo jeito.
4. **Verificação de fidelidade:** cada tópico é procurado no texto colado, ignorando acentos, caixa, pontuação e espaços. Ele passa se aparecer como trecho do texto ou se pelo menos 80% das palavras significativas dele aparecerem perto umas das outras. Os que não passam não são removidos: a revisão mostra quantos são e destaca cada um, e o destaque some quando o tópico é editado.
5. **Fallback:** se a IA falhar em qualquer parte (timeout, erro HTTP, resposta inválida, truncada ou vazia), as outras partes são canceladas e o app usa a leitura padrão no mesmo texto, avisando na revisão.

A revisão indica a origem da estrutura ("Estrutura extraída com IA" ou "Leitura padrão") e mostra as observações que a IA fez sobre o texto.

**Rate limit:** 5 extrações por hora e 20 por dia por usuário, contando sucessos e falhas. Uma extração conta uma vez, qualquer que seja o número de partes. Ao passar do limite, a tela diz a partir de quando dá para tentar de novo, e a leitura padrão continua disponível. Cada tentativa fica registrada em `UsoIA`, com modelo, tokens, custo e tipo do erro, mas nunca o texto do edital. A chave só existe no servidor, e os logs registram só o tipo do erro, o status, o modelo e o tamanho do texto.

### Editar estrutura e reimportar

Depois de salva, a estrutura pode ser editada em `/concursos/[id]/estrutura` ou trocada por uma reimportação. Nos dois casos o progresso é preservado (`src/lib/sincronizar-edital.ts`): tópicos existentes são reaproveitados pelo id (edição) ou pelo nome/título normalizado (reimportação), e só o que sobrar da estrutura antiga é excluído.

### Edital e status dos tópicos

Em `/concursos/[id]/edital`, as matérias aparecem em acordeão com barra de progresso. Cada tópico tem um chip de status que muda com um toque, com atualização otimista: Não iniciado (cinza), Teoria (azul claro), Exercícios (azul) e Revisado (verde). Há busca por texto e filtro por status. Tocar no tópico abre um painel com status, anotações e links.

### Painel

Em `/concursos/[id]`:

- anel de progresso geral, com "X de Y tópicos revisados";
- barras por matéria empilhadas por status, ordenadas por prioridade e depois pelo menor progresso. Tocar numa barra leva à matéria no edital;
- contagem regressiva e ritmo necessário. Abaixo de 1 tópico por dia, o ritmo aparece como "1 tópico a cada N dias";
- atalho "Continuar estudando";
- quantas pessoas copiaram a estrutura, se ela estiver compartilhada.

Regras de progresso (`src/lib/progresso.ts`):

- valor do status: Não iniciado = 0, Teoria = 1/3, Exercícios = 2/3, Revisado = 1;
- progresso da matéria = média dos seus tópicos (sem tópicos = 0);
- progresso do concurso = média das matérias ponderada pelo peso;
- ritmo = tópicos não revisados ÷ dias até a prova, no fuso `America/Sao_Paulo`.

### Afinidade

Em `/concursos/[id]/afinidade`, você define a dificuldade (fácil, neutro, difícil) de cada matéria e, se quiser, de tópicos específicos. Um tópico sem dificuldade própria herda a da matéria. A afinidade é usada pela agenda.

### Agenda de estudos

A rotina é do usuário e vale para todos os concursos: dias da semana, horário de início, minutos de estudo por dia, duração do bloco (padrão 60 min) e pausa entre blocos (padrão 15 min). Em `/concursos/[id]/agenda`, os tópicos pendentes são distribuídos nos horários da rotina (`src/lib/agenda.ts`):

- cada bloco é de uma matéria só, e blocos seguidos são de matérias diferentes sempre que possível;
- as matérias se revezam na proporção de peso × dificuldade. Dentro da matéria, os tópicos seguem a ordem do edital;
- um tópico precisa de 1, 2 ou 3 blocos (fácil, neutro, difícil), e o status já cumprido desconta blocos;
- sobra do dia menor que metade de um bloco não vira bloco;
- a agenda mostra a data prevista para cobrir o edital ou, se não der tempo, quantas horas faltam até a prova. A simulação vai até 3 anos.

### Compartilhamento da estrutura

Nos ajustes do concurso, o dono pode gerar um link público (`/c/[token]`, token aleatório de 128 bits). Quem abre o link vê a estrutura, com o nome do dono (nunca o email), e pode copiá-la para a própria conta depois de entrar. A cópia leva concurso, matérias, pesos e tópicos, mas não leva progresso, notas, links nem afinidade. Cada pessoa conta uma vez no contador de cópias. Desativar o link invalida o token; reativar gera um novo, e as cópias já contadas continuam.

### Conta e navegação

- `/conta`: email, nome, tema (claro, escuro ou sistema) e sair.
- Navegação fixa (barra inferior no celular, lateral no desktop): Concursos · Painel · Agenda · Edital · Conta. Painel, Agenda e Edital apontam para o último concurso acessado ou, se houver só um, para ele.

## Stack

Next.js 16 (App Router) + TypeScript strict · Tailwind CSS 4 + shadcn/ui · Prisma 7 + PostgreSQL (Supabase em produção) · Auth.js · Zod · Vitest · deploy na Vercel.

## Requisitos

- Node.js 22+
- Docker (para o Postgres local) ou um projeto no Supabase

## Rodando localmente

```bash
# 1. Dependências (o postinstall já roda `prisma generate`)
npm install

# 2. Variáveis de ambiente
cp .env.example .env
# Para o Postgres local do docker compose, use:
# DATABASE_URL="postgresql://ascend:ascend@localhost:5433/ascend"
# DIRECT_URL="postgresql://ascend:ascend@localhost:5433/ascend"
# Gere o AUTH_SECRET com: npx auth secret   (ou: openssl rand -base64 32)
# Sem as variáveis GMAIL_OAUTH_*, em desenvolvimento o código de login sai no console.
# Opcional: OPENROUTER_API_KEY, OPENROUTER_MODEL e OPENROUTER_FALLBACK_MODELS ligam a
# extração do edital com IA. Sem a chave, o botão não aparece.

# 3. Banco de dados
docker compose up -d        # Postgres 17 na porta 5433
npm run db:migrate          # aplica as migrations

# 4. App
npm run dev                 # http://localhost:3000

# 5. (Opcional) concurso de exemplo para o seu email
SEED_EMAIL=voce@email.com npm run db:seed
```

### Seed

O seed cria, para o email informado, o concurso de exemplo "Escrevente — Ministério Público" com matérias e tópicos, além de uma rotina padrão (segunda a sexta, às 19h, 3h por dia). A rotina só é criada se o usuário ainda não tiver uma. O seed pode rodar de novo, porque recria o concurso de exemplo.

Há duas versões:

- `npm run db:seed` (`prisma/seed.ts`), usando a variável `SEED_EMAIL`;
- `prisma/seed.sql`, para rodar direto no psql ou no SQL Editor do Supabase, trocando o email em `v_email`.

Ao mudar uma delas, mantenha a outra em sincronia.

### Usando o Supabase

O Supabase é usado apenas como Postgres. Em **Project Settings → Database → Connection string**:

- `DATABASE_URL`: _Transaction pooler_ (porta 6543), acrescentando `?pgbouncer=true`. É a conexão usada pelo app em runtime.
- `DIRECT_URL`: conexão direta ou _Session pooler_ (porta 5432). É usada pelo Prisma CLI (`migrate`, `studio`).

### Deploy na Vercel

A Vercel usa o script `vercel-build`. Nos deploys de **produção** (`VERCEL_ENV=production`), ele aplica as migrations pendentes (`prisma migrate deploy`) antes do build. Se a migration falhar, o deploy é interrompido e a versão anterior continua no ar. Deploys de preview não tocam no banco.

Configure na Vercel, no ambiente Production, `DATABASE_URL` (pooler, porta 6543) e `DIRECT_URL` (conexão direta ou Session pooler, porta 5432). As migrations usam a `DIRECT_URL`. Para aplicar migrations manualmente: `npm run db:deploy`.

Para ligar a extração com IA, configure também no ambiente Production `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` (um modelo com suporte a structured outputs) e, se quiser, `OPENROUTER_FALLBACK_MODELS` (separados por vírgula). A página de importação tem `maxDuration = 150`, para a chamada caber no limite da função. Esse valor exige o Fluid Compute (padrão nos projetos novos da Vercel).

## Login

Login sem senha: o usuário informa o email e recebe um código de 6 dígitos (válido por 10 min), enviado pelo Gmail via OAuth2. O código é validado pelo callback do Auth.js (`/api/auth/callback/otp`). Limites: 3 envios e 5 tentativas de código por email a cada 15 minutos. Depois de entrar, o usuário volta para a página que tinha pedido (por exemplo, um link de compartilhamento).

Todas as rotas exigem login, exceto as de login, `/api/auth/*`, os links de compartilhamento (`/c/[token]`), `/offline` e os assets.

## PWA

O app é instalável (manifest em `src/app/manifest.ts`, ícones em `public/icons`). O service worker (`public/sw.js`) só é registrado em produção. Ele guarda os assets estáticos e mostra `/offline` quando não há rede. Para testar localmente, use `npm run build && npm start`.

## Testes

`npm test` roda os testes unitários da lógica pura, que ficam ao lado do código em `src/lib/*.test.ts`: parser e revisão do edital, sincronização da estrutura, progresso, agenda, datas, filtro do edital, OTP, navegação, destino do login e validações. Os testes da extração com IA ficam em `src/lib/extracao-ia/*.test.ts` (schema, prompt, cliente do OpenRouter com `fetch` simulado, divisão em partes, extração em paralelo, pós-processamento, fidelidade, limites e rate limit). Os testes não precisam de banco nem de rede. Os fixtures do parser estão em `src/lib/__fixtures__/`.

Para comparar a IA com o parser nos fixtures (número de matérias e tópicos, diferenças, tópicos não encontrados, tempo, tokens e custo), use `npm run avaliar:ia`. Ele chama a API de verdade e precisa da chave no `.env`, por isso fica fora do `npm test`. Para rodar um fixture só: `npm run avaliar:ia -- pdf-baguncado`.

## Scripts

| Comando                           | O que faz                                                      |
| --------------------------------- | -------------------------------------------------------------- |
| `npm run dev`                     | Servidor de desenvolvimento                                    |
| `npm run build`                   | Gera o Prisma Client e faz o build de produção                 |
| `npm start`                       | Sobe o build de produção                                       |
| `npm run lint`                    | ESLint                                                         |
| `npm run typecheck`               | `tsc --noEmit`                                                 |
| `npm test` / `test:watch`         | Testes unitários (Vitest), uma vez ou em modo watch            |
| `npm run format` / `format:check` | Prettier                                                       |
| `npm run db:migrate`              | Cria/aplica migrations em desenvolvimento                      |
| `npm run db:deploy`               | Aplica migrations em produção                                  |
| `npm run db:seed`                 | Concurso de exemplo para `SEED_EMAIL` (pode rodar de novo)     |
| `npm run db:studio`               | Prisma Studio                                                  |
| `npm run avaliar:ia`              | Compara IA e parser nos fixtures (chama a API, gasta créditos) |

## Estrutura

```
prisma/              schema, migrations e seed (TS e SQL)
src/app/             rotas (App Router)
src/components/      componentes por área (agenda, edital, painel...) e ui/ (shadcn/ui)
src/lib/             lógica pura (parser, progresso, agenda...), validações Zod e clientes (prisma, email)
src/lib/extracao-ia/ extração do edital com IA (schema, prompt, cliente OpenRouter, pós-processamento)
src/server/actions/  server actions
src/server/data/     acesso a dados (sempre filtrado por userId)
src/proxy.ts         proteção das rotas
src/generated/       Prisma Client gerado (não versionado)
scripts/             scripts manuais (avaliação da extração com IA)
```

## Convenções

- Interface em português do Brasil, assim como os nomes de domínio (Concurso, Materia, Topico).
- Datas no formato `dd/mm/aaaa`, fuso `America/Sao_Paulo`.
- Toda entrada de server action é validada com Zod.
- Regras de negócio ficam em `src/lib` e `src/server`, nunca nos componentes.
- Toda leitura e escrita no banco passa por `src/server/data/*` e filtra pelo `userId` da sessão. IDs vindos do cliente sempre têm o dono checado.
