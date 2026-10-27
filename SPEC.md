# Spec — Ascend, app de estudos para concursos (MVP)

> Documento de handoff para desenvolvimento do zero. Leia tudo antes de começar, siga a ordem das etapas em "Plano de implementação" e marque cada etapa como concluída ao terminá-la.

## 1. Visão geral

Webapp **mobile first** em que o concurseiro:

1. cadastra cada concurso que está estudando;
2. importa o conteúdo programático do edital (texto colado);
3. revisa a estrutura gerada (matérias → tópicos);
4. marca o status de cada tópico enquanto estuda;
5. acompanha o progresso em um painel com gráficos.

O primeiro usuário estuda para **Escrevente do Ministério Público**, principalmente pelo celular. O app deve nascer pronto para virar produto multiusuário: cada usuário só vê os próprios dados.

### Fora do escopo do MVP (não implementar agora)

- Upload de PDF e estruturação do edital com IA
- Registro de sessões de estudo (tempo, questões, acertos)
- Metas semanais e revisão espaçada
- Vínculo da mesma disciplina entre concursos diferentes
- Assinatura/pagamento

Mesmo assim, deixe o código organizado para que essas features entrem depois sem reescrita.

## 2. Stack

| Camada    | Escolha                                                                  |
| --------- | ------------------------------------------------------------------------ |
| Framework | Next.js (App Router) + TypeScript (strict)                               |
| UI        | Tailwind CSS + shadcn/ui, ícones lucide-react                            |
| Gráficos  | Recharts                                                                 |
| Banco     | PostgreSQL hospedado no Supabase (usado só como Postgres)                |
| ORM       | Prisma                                                                   |
| Auth      | Auth.js / NextAuth v5 com `@auth/prisma-adapter`, login por OTP no email |
| Email     | Gmail (OAuth2) via Nodemailer — substitui o Resend                       |
| Validação | Zod                                                                      |
| Testes    | Vitest para lógica pura (parser, cálculo de progresso)                   |
| Deploy    | Vercel                                                                   |
| PWA       | manifest + service worker simples (instalável no celular)                |

Use Server Actions e Server Components sempre que possível; Client Components só onde houver interação (gráficos, drag and drop, formulários com estado).

### Variáveis de ambiente (`.env.example`)

```
DATABASE_URL=
DIRECT_URL=
AUTH_SECRET=
AUTH_URL=http://localhost:3000
AUTH_RESEND_KEY=
EMAIL_FROM="Ascend <nao-responda@seudominio.com>"
```

## 3. Autenticação por OTP

Login sem senha, por código de 6 dígitos enviado ao email.

### Fluxo

1. **`/login`** — campo de email. Ao enviar, chama `signIn('resend', { email, redirect: false })` e navega para `/login/codigo?email=...`.
2. **Envio** — o provider Resend do Auth.js é customizado:
   - `generateVerificationToken`: retorna um código numérico aleatório de 6 dígitos (use `crypto.randomInt`, com zeros à esquerda).
   - `sendVerificationRequest`: envia email com **apenas o código** (sem link), template simples em pt-BR.
   - `maxAge`: 10 minutos.
3. **`/login/codigo`** — input de 6 dígitos (`inputMode="numeric"`, `autoComplete="one-time-code"`, autofocus, colar código funciona). Ao confirmar, redireciona para `/api/auth/callback/resend?email=<email>&token=<codigo>&callbackUrl=/concursos`.
4. **Sessão** — o Auth.js valida o token na tabela `VerificationToken`, consome e cria a sessão (estratégia `database` via Prisma adapter).
5. Botão "Reenviar código" com cooldown de 60 s.

### Segurança

- Limitar a **5 tentativas de código por email a cada 15 minutos** e **3 envios de código por email a cada 15 minutos** (tabela `AuthAttempt` no banco; checar antes de enviar e antes de redirecionar para o callback, via Server Action).
- Mensagens de erro genéricas ("Código inválido ou expirado").
- Middleware protegendo todas as rotas exceto `/login`, `/login/codigo`, `/api/auth/*` e assets.
- **Isolamento de dados:** toda leitura e escrita no banco filtra pelo `userId` da sessão. Centralize isso em funções de acesso a dados (`src/server/data/*`) que recebem o `userId`; nunca confie em IDs vindos do cliente sem checar o dono.

> O padrão do provider de email do Auth.js é link mágico. Confirme na documentação atual do Auth.js os nomes exatos das opções e da rota de callback antes de implementar.

## 4. Modelo de dados (Prisma)

```prisma
// Modelos do Auth.js
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
  concursos     Concurso[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Account {
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@id([provider, providerAccountId])
}

model Session {
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String
  expires    DateTime
  @@id([identifier, token])
}

model AuthAttempt {
  id        String   @id @default(cuid())
  email     String
  kind      String   // "send" | "verify"
  createdAt DateTime @default(now())
  @@index([email, kind, createdAt])
}

// Domínio
model Concurso {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  nome      String    // ex.: "Escrevente — Ministério Público"
  banca     String?
  cargo     String?
  dataProva DateTime?
  cor       String    @default("blue")
  materias  Materia[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  @@index([userId])
}

enum Prioridade {
  BAIXA
  MEDIA
  ALTA
}

model Materia {
  id         String     @id @default(cuid())
  concursoId String
  concurso   Concurso   @relation(fields: [concursoId], references: [id], onDelete: Cascade)
  nome       String
  peso       Int        @default(1)   // 1 a 5
  prioridade Prioridade @default(MEDIA)
  ordem      Int
  topicos    Topico[]
  @@index([concursoId])
}

enum StatusTopico {
  NAO_INICIADO
  TEORIA
  EXERCICIOS
  REVISADO
}

model Topico {
  id        String       @id @default(cuid())
  materiaId String
  materia   Materia      @relation(fields: [materiaId], references: [id], onDelete: Cascade)
  titulo    String
  ordem     Int
  status    StatusTopico @default(NAO_INICIADO)
  nota      String?      // anotações livres
  links     String[]     @default([])
  updatedAt DateTime     @updatedAt
  @@index([materiaId])
}
```

## 5. Regras de progresso

Implemente em `src/lib/progresso.ts`, como funções puras com testes.

- Valor de cada status: `NAO_INICIADO = 0`, `TEORIA = 1/3`, `EXERCICIOS = 2/3`, `REVISADO = 1`.
- **Progresso da matéria** = média dos valores dos seus tópicos (matéria sem tópicos = 0).
- **Progresso do concurso** = média dos progressos das matérias ponderada pelo `peso`.
- **Concluídos** = tópicos com status `REVISADO`.
- **Ritmo necessário** = tópicos não revisados ÷ dias até `dataProva` (se houver data); mostrar como "X tópicos/dia".
- **Dias até a prova** = diferença em dias inteiros, no fuso `America/Sao_Paulo`.

## 6. Importação do edital (parser)

Implemente em `src/lib/parser-edital.ts` como função pura `parseEdital(texto: string): MateriaParseada[]` com testes Vitest.

```ts
type MateriaParseada = { nome: string; topicos: string[] };
```

### Heurísticas

1. Normalizar: trocar `\r\n` por `\n`, remover espaços duplicados, remover hifenização de quebra de linha (`pala-\nvra` → `palavra`), juntar linhas quebradas no meio de uma frase.
2. **Detectar matéria** quando a linha:
   - está toda em CAIXA ALTA (ignorando números e pontuação) e tem até ~80 caracteres; ou
   - termina com `:` e não começa com numeração de tópico; ou
   - casa com padrões comuns como `NOÇÕES DE ...`, `CONHECIMENTOS ...`, `LÍNGUA PORTUGUESA`, `DIREITO ...`.
3. **Detectar tópicos** dentro da matéria corrente:
   - itens numerados (`1.`, `1.1`, `1)`, `a)`, `I -`, `•`, `-`);
   - texto corrido separado por `;` ou por `. ` seguido de número;
   - remover a numeração do início do título e o ponto/ponto e vírgula final.
4. Subtópicos (`1.1`, `1.2`) viram tópicos próprios no MVP; não há hierarquia além de matéria → tópico.
5. Linhas que não se encaixam em nada vão para uma matéria "Sem matéria" para o usuário mover na revisão.
6. Ignorar tópicos vazios e duplicados exatos na mesma matéria.

Crie fixtures de teste em `src/lib/__fixtures__/` com pelo menos: edital com matérias em caixa alta e tópicos numerados; edital em texto corrido com `;`; texto bagunçado com quebras de linha de PDF.

### Tela de revisão

Depois de colar o texto, mostrar a árvore gerada **antes de salvar**, com:

- renomear matéria e tópico (edição inline);
- excluir matéria ou tópico;
- adicionar tópico e matéria;
- mover tópico entre matérias e reordenar (drag and drop com `@dnd-kit`, com alternativa por menu "Mover para..." no celular);
- mesclar duas matérias;
- definir peso de cada matéria;
- botão "Salvar edital", que grava tudo em uma transação.

## 7. Telas e navegação (mobile first)

Layout pensado para 360–430 px de largura e uso com uma mão. **Barra de navegação inferior** fixa com: Concursos · Painel · Edital · Conta. No desktop, a mesma navegação vira barra lateral.

| Rota                            | Tela                | Conteúdo                                                                                                                                                                                                      |
| ------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/login`, `/login/codigo`       | Login               | Email → código OTP                                                                                                                                                                                            |
| `/concursos`                    | Meus concursos      | Cards com nome, anel de progresso, % e "faltam X dias". Botão flutuante "+ Novo concurso". Estado vazio convidando a cadastrar o primeiro                                                                     |
| `/concursos/novo`               | Novo concurso       | Passo 1: nome, banca, cargo, data da prova, cor. Passo 2: colar conteúdo programático. Passo 3: revisão da árvore (seção 6)                                                                                   |
| `/concursos/[id]`               | Painel do concurso  | Gráficos da seção 8 + atalho "Continuar estudando" (próximo tópico não revisado da matéria de maior prioridade)                                                                                               |
| `/concursos/[id]/edital`        | Edital              | Lista de matérias (acordeão) com barra de progresso; dentro, os tópicos com seletor de status em um toque. Busca por texto e filtro por status. Tocar no tópico abre um bottom sheet com status, nota e links |
| `/concursos/[id]/configuracoes` | Ajustes do concurso | Editar dados, peso e prioridade das matérias, reimportar/editar edital, excluir concurso                                                                                                                      |
| `/conta`                        | Conta               | Email, nome, sair                                                                                                                                                                                             |

### Interação de status

- Na lista de tópicos, o status aparece como um chip colorido; um toque abre um menu com os 4 status. Atualização otimista (`useOptimistic`), com rollback em caso de erro.
- Cores dos status: Não iniciado (cinza), Teoria (azul claro), Exercícios (azul), Revisado (verde).

## 8. Painel e gráficos

No painel do concurso (Recharts, responsivo, legível no celular):

1. **Anel de progresso geral** — % do concurso (seção 5), com "X de Y tópicos revisados" abaixo.
2. **Barras horizontais por matéria, empilhadas por status** — quantidade de tópicos em cada status, matérias ordenadas por prioridade e depois por menor progresso. Tocar numa barra leva à matéria no edital.
3. **Contagem regressiva** — dias até a prova e ritmo necessário em tópicos/dia. Se não houver data, mostrar um convite para cadastrá-la.

Em `/concursos`, cada card mostra o anel do concurso, dando a visão macro entre concursos.

## 9. Estrutura de pastas sugerida

```
src/
  app/
    (auth)/login/page.tsx
    (auth)/login/codigo/page.tsx
    (app)/layout.tsx              // nav inferior / lateral
    (app)/concursos/page.tsx
    (app)/concursos/novo/page.tsx
    (app)/concursos/[id]/page.tsx
    (app)/concursos/[id]/edital/page.tsx
    (app)/concursos/[id]/configuracoes/page.tsx
    (app)/conta/page.tsx
    api/auth/[...nextauth]/route.ts
    manifest.ts
  auth.ts                         // config do Auth.js
  middleware.ts
  components/                     // ui (shadcn), charts, edital, etc.
  lib/
    progresso.ts
    parser-edital.ts
    prisma.ts
    email/otp-template.tsx
  server/
    actions/                      // server actions por domínio
    data/                         // acesso a dados sempre com userId
prisma/
  schema.prisma
  seed.ts
```

## 10. Plano de implementação

Faça em etapas, rodando lint, typecheck e testes ao fim de cada uma.

1. ✅ **Setup** — Next.js + TS strict, Tailwind, shadcn/ui, ESLint/Prettier, Vitest, Prisma conectado ao Postgres, `.env.example`, README com instruções para rodar.
2. ✅ **Auth OTP** — schema do Auth.js, provider Resend customizado, telas `/login` e `/login/codigo`, rate limit, middleware. Em desenvolvimento, se `AUTH_RESEND_KEY` não estiver definida, logar o código no console.
3. **Layout mobile first** — app shell com navegação inferior/lateral, tema claro e escuro, PWA (manifest, ícones, service worker básico).
4. **CRUD de concursos** — lista, criação (passo 1), edição, exclusão.
5. **Parser + revisão do edital** — `parseEdital` com testes, telas dos passos 2 e 3, gravação em transação.
6. **Edital e status** — lista por matéria, troca de status otimista, bottom sheet com nota e links, busca e filtros.
7. **Progresso e painel** — `progresso.ts` com testes, os três gráficos, anéis em `/concursos`, "Continuar estudando".
8. **Ajustes do concurso** — peso, prioridade, reordenação de matérias, reimportação.
9. **Seed e polimento** — seed com um concurso de exemplo (Escrevente MP com algumas matérias e tópicos fictícios), estados vazios, loading skeletons, mensagens de erro, acessibilidade básica (labels, foco, contraste).

## 11. Critérios de aceite do MVP

- [ ] Login por email + código de 6 dígitos funciona no celular, com código expirando em 10 min e limite de tentativas.
- [ ] Um usuário nunca consegue ver ou alterar dados de outro (testar trocando IDs na URL e nas actions).
- [ ] Colar um conteúdo programático real gera matérias e tópicos coerentes, e o usuário consegue corrigir tudo antes de salvar.
- [ ] Trocar o status de um tópico leva um toque para abrir e um para escolher, e reflete no painel.
- [ ] O painel mostra anel geral, barras por matéria empilhadas por status e contagem regressiva.
- [ ] Todas as telas funcionam bem em 375 px de largura; o app pode ser instalado na tela inicial do celular.
- [ ] Testes de `parser-edital` e `progresso` passando; `tsc` e lint sem erros.

## 12. Convenções

- Interface e textos em **português do Brasil**; código (variáveis, funções) em inglês ou português de forma consistente; nomes de domínio (Concurso, Materia, Topico) em português.
- Datas exibidas no formato `dd/mm/aaaa`, fuso `America/Sao_Paulo`.
- Validar todas as entradas de Server Actions com Zod.
- Nada de lógica de negócio dentro de componentes; regras ficam em `lib/` e `server/`.
- Commits pequenos, um por etapa ou subetapa.
