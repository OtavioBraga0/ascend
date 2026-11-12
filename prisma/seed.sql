-- Versão em SQL de prisma/seed.ts: cria o concurso de exemplo (Escrevente do
-- MP) para o usuário do email abaixo. Pode ser rodado de novo: recria o
-- concurso de exemplo e não mexe na rotina de quem já definiu a sua.
--
-- Roda no psql ou no SQL Editor do Supabase. Troque o email em v_email.
-- Mantenha em sincronia com prisma/seed.ts.

DO $$
DECLARE
  v_email    text := lower(trim('voce@exemplo.com'));
  v_nome     constant text := 'Escrevente — Ministério Público (exemplo)';
  -- O Prisma grava os timestamps em UTC, sem fuso.
  v_agora    timestamp := now() AT TIME ZONE 'UTC';
  v_user_id  text;
  v_concurso text := gen_random_uuid()::text;
  v_materia  text;
  m          record;
BEGIN
  -- O Auth.js reaproveita o usuário pelo email no primeiro login.
  INSERT INTO "User" (id, email, "createdAt", "updatedAt")
  VALUES (gen_random_uuid()::text, v_email, v_agora, v_agora)
  ON CONFLICT (email) DO NOTHING;
  SELECT id INTO v_user_id FROM "User" WHERE email = v_email;

  -- Não sobrescreve a rotina de quem já definiu a sua.
  INSERT INTO "Rotina" (id, "userId", "diasSemana", "inicioMinutos", "minutosPorDia")
  VALUES (gen_random_uuid()::text, v_user_id, ARRAY[1, 2, 3, 4, 5], 19 * 60, 3 * 60)
  ON CONFLICT ("userId") DO NOTHING;

  -- Matérias e tópicos saem junto, pelo ON DELETE CASCADE.
  DELETE FROM "Concurso" WHERE "userId" = v_user_id AND nome = v_nome;

  INSERT INTO "Concurso"
    (id, "userId", nome, banca, cargo, "dataProva", cor, "createdAt", "updatedAt")
  VALUES
    (v_concurso, v_user_id, v_nome, 'Vunesp', 'Oficial de Promotoria',
     v_agora::date + 120, 'violet', v_agora, v_agora);

  -- Tópicos de exemplo, no estilo de um conteúdo programático real. Cada
  -- tópico é [título] ou [título, status]; sem status, NAO_INICIADO.
  FOR m IN
    SELECT dados, n - 1 AS ordem
    FROM jsonb_array_elements($json$[
      {
        "nome": "Língua Portuguesa", "peso": 3, "prioridade": "ALTA",
        "topicos": [
          ["Leitura e interpretação de textos", "REVISADO"],
          ["Sinônimos e antônimos", "REVISADO"],
          ["Pontuação", "EXERCICIOS"],
          ["Classes de palavras", "EXERCICIOS"],
          ["Concordância verbal e nominal", "TEORIA"],
          ["Regência verbal e nominal", "TEORIA"],
          ["Colocação pronominal"],
          ["Crase"]
        ]
      },
      {
        "nome": "Matemática", "peso": 1, "prioridade": "MEDIA", "dificuldade": "DIFICIL",
        "topicos": [
          ["Operações com números reais", "REVISADO"],
          ["Razão e proporção", "EXERCICIOS"],
          ["Porcentagem", "TEORIA"],
          ["Regra de três simples e composta"],
          ["Juro simples"]
        ]
      },
      {
        "nome": "Noções de Informática", "peso": 1, "prioridade": "BAIXA", "dificuldade": "FACIL",
        "topicos": [
          ["Windows: pastas, arquivos e atalhos", "TEORIA"],
          ["Word: edição e formatação de textos"],
          ["Excel: fórmulas e funções básicas"],
          ["Correio eletrônico"]
        ]
      },
      {
        "nome": "Noções de Direito Constitucional", "peso": 2, "prioridade": "ALTA",
        "topicos": [
          ["Princípios fundamentais (arts. 1º ao 4º)", "EXERCICIOS"],
          ["Direitos e garantias fundamentais (art. 5º)", "TEORIA"],
          ["Administração Pública (arts. 37 a 41)"],
          ["Funções essenciais à Justiça: Ministério Público"]
        ]
      },
      {
        "nome": "Noções de Direito Administrativo", "peso": 2, "prioridade": "MEDIA",
        "topicos": [
          ["Atos administrativos"],
          ["Poderes administrativos"],
          ["Improbidade administrativa (Lei nº 8.429/1992)"]
        ]
      },
      {
        "nome": "Legislação Institucional", "peso": 2, "prioridade": "MEDIA",
        "topicos": [
          ["Lei Orgânica do Ministério Público do Estado (exemplo)"],
          ["Estatuto dos servidores: direitos e deveres"]
        ]
      }
    ]$json$::jsonb) WITH ORDINALITY AS materias(dados, n)
  LOOP
    v_materia := gen_random_uuid()::text;

    INSERT INTO "Materia" (id, "concursoId", nome, peso, prioridade, dificuldade, ordem)
    VALUES (
      v_materia,
      v_concurso,
      m.dados ->> 'nome',
      (m.dados ->> 'peso')::int,
      (m.dados ->> 'prioridade')::"Prioridade",
      coalesce(m.dados ->> 'dificuldade', 'NEUTRO')::"Dificuldade",
      m.ordem
    );

    INSERT INTO "Topico" (id, "materiaId", titulo, status, ordem, "updatedAt")
    SELECT
      gen_random_uuid()::text,
      v_materia,
      topico ->> 0,
      coalesce(topico ->> 1, 'NAO_INICIADO')::"StatusTopico",
      n - 1,
      v_agora
    FROM jsonb_array_elements(m.dados -> 'topicos') WITH ORDINALITY AS t(topico, n);
  END LOOP;

  RAISE NOTICE 'Concurso de exemplo criado para %: % matérias, % tópicos.',
    v_email,
    (SELECT count(*) FROM "Materia" WHERE "concursoId" = v_concurso),
    (SELECT count(*) FROM "Topico" t JOIN "Materia" mt ON mt.id = t."materiaId"
      WHERE mt."concursoId" = v_concurso);
END
$$;
