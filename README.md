# Ascend

App de estudos para concursos, mobile first: cadastre o concurso, importe o conteúdo programático do edital, marque o status de cada tópico e acompanhe o progresso. A especificação completa está em [SPEC.md](SPEC.md).

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

# 3. Banco de dados
docker compose up -d        # Postgres 17 na porta 5433
npm run db:migrate          # aplica as migrations

# 4. App
npm run dev                 # http://localhost:3000
```

### Usando o Supabase

O Supabase é usado apenas como Postgres. Em **Project Settings → Database → Connection string**:

- `DATABASE_URL`: _Transaction pooler_ (porta 6543), acrescentando `?pgbouncer=true`. É a conexão usada pelo app em runtime.
- `DIRECT_URL`: conexão direta ou _Session pooler_ (porta 5432). É usada pelo Prisma CLI (`migrate`, `studio`).

Em produção, rode `npm run db:deploy` para aplicar as migrations.

## Login

Login sem senha: o usuário informa o email e recebe um código de 6 dígitos (válido por 10 min), enviado pelo Gmail via OAuth2. O código é validado pelo callback do Auth.js (`/api/auth/callback/otp`). Limites: 3 envios e 5 tentativas de código por email a cada 15 minutos.

## Scripts

| Comando                           | O que faz                                      |
| --------------------------------- | ---------------------------------------------- |
| `npm run dev`                     | Servidor de desenvolvimento                    |
| `npm run build`                   | Gera o Prisma Client e faz o build de produção |
| `npm run lint`                    | ESLint                                         |
| `npm run typecheck`               | `tsc --noEmit`                                 |
| `npm test`                        | Testes (Vitest)                                |
| `npm run format` / `format:check` | Prettier                                       |
| `npm run db:migrate`              | Cria/aplica migrations em desenvolvimento      |
| `npm run db:deploy`               | Aplica migrations em produção                  |
| `npm run db:seed`                 | Popula o banco com dados de exemplo            |
| `npm run db:studio`               | Prisma Studio                                  |

## Estrutura

```
prisma/              schema, migrations e seed
src/app/             rotas (App Router)
src/components/ui/   componentes shadcn/ui
src/lib/             lógica pura (parser, progresso) e clientes (prisma)
src/server/          server actions e acesso a dados (sempre filtrado por userId)
src/generated/       Prisma Client gerado (não versionado)
```
