import { CalendarDays, ChevronDown, LogIn } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { CopiarEstrutura } from "@/components/compartilhamento/copiar-estrutura";
import { LinkIndisponivel } from "@/components/compartilhamento/link-indisponivel";
import { ButtonLink } from "@/components/ui/button-link";
import { formatarData } from "@/lib/datas";
import { parametroVoltar } from "@/lib/destino-login";
import { getOptionalUser } from "@/server/auth";
import {
  getEstruturaCompartilhada,
  jaCopiou,
  type EstruturaCompartilhada,
} from "@/server/data/compartilhamento";

export const metadata: Metadata = {
  title: "Estrutura compartilhada · Ascend",
  // O link é privado de quem compartilhou; não deve aparecer em buscadores.
  robots: { index: false, follow: false },
};

/** Pré-visualização pública de uma estrutura compartilhada. */
export default function CompartilhadoPage({ params }: PageProps<"/c/[token]">) {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          aria-label="Carregando"
          className="h-64 animate-pulse rounded-xl bg-muted"
        />
      }
    >
      <Compartilhado params={params} />
    </Suspense>
  );
}

async function Compartilhado({
  params,
}: Pick<PageProps<"/c/[token]">, "params">) {
  const { token } = await params;
  const [estrutura, user] = await Promise.all([
    getEstruturaCompartilhada(token),
    getOptionalUser(),
  ]);

  // O Proxy já responde 404 para links inexistentes ou desativados; isto cobre
  // o link desativado entre a checagem do Proxy e esta leitura.
  if (!estrutura) return <LinkIndisponivel />;

  const { concurso, donoNome } = estrutura;
  const totalTopicos = concurso.materias.reduce(
    (soma, m) => soma + m.topicos.length,
    0,
  );
  const detalhes = [concurso.banca, concurso.cargo].filter(Boolean).join(" · ");

  return (
    <>
      <section className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Estrutura compartilhada{donoNome && ` por ${donoNome}`}
        </p>
        <h1 className="text-xl font-semibold break-words">{concurso.nome}</h1>
        {detalhes && (
          <p className="text-sm text-muted-foreground">{detalhes}</p>
        )}
        {concurso.dataProva && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="size-4 shrink-0" aria-hidden />
            Prova em {formatarData(concurso.dataProva)}
          </p>
        )}
        <p className="text-sm">
          {concurso.materias.length}{" "}
          {concurso.materias.length === 1 ? "matéria" : "matérias"} ·{" "}
          {totalTopicos} {totalTopicos === 1 ? "tópico" : "tópicos"}
        </p>
      </section>

      <Acao token={token} estrutura={estrutura} userId={user?.id ?? null} />

      <section aria-labelledby="materias" className="space-y-2">
        <h2 id="materias" className="font-medium">
          Matérias
        </h2>
        <ol className="space-y-2">
          {concurso.materias.map((materia) => (
            <li key={materia.id} className="rounded-xl border">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-start gap-2 rounded-xl p-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium break-words">
                      {materia.nome}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Peso {materia.peso} · {materia.topicos.length}{" "}
                      {materia.topicos.length === 1 ? "tópico" : "tópicos"}
                    </span>
                  </span>
                  <ChevronDown
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <ol className="list-decimal space-y-1.5 border-t py-3 pr-4 pl-9 text-sm marker:text-muted-foreground">
                  {materia.topicos.map((topico) => (
                    <li key={topico.id} className="break-words">
                      {topico.titulo}
                    </li>
                  ))}
                </ol>
              </details>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

/** O que a pessoa pode fazer: entrar, copiar ou, se for o dono, nada. */
async function Acao({
  token,
  estrutura,
  userId,
}: {
  token: string;
  estrutura: EstruturaCompartilhada;
  userId: string | null;
}) {
  const aviso = (
    <p className="text-xs text-muted-foreground">
      A cópia leva só a estrutura (matérias, pesos, tópicos e data da prova). O
      progresso e as anotações de quem compartilhou não vão junto, e mudanças
      feitas depois por essa pessoa não chegam à sua cópia.
    </p>
  );

  if (!userId) {
    return (
      <section className="space-y-3 rounded-xl border p-4">
        <p className="text-sm">
          Para copiar esta estrutura, entre com seu email. Se ainda não tem
          conta, ela é criada na hora.
        </p>
        <ButtonLink
          size="lg"
          className="h-11 w-full sm:w-auto"
          href={`/login${parametroVoltar(`/c/${token}`)}`}
        >
          <LogIn aria-hidden />
          Entrar para copiar
        </ButtonLink>
        {aviso}
      </section>
    );
  }

  if (userId === estrutura.donoId) {
    return (
      <section className="space-y-1 rounded-xl border p-4">
        <p className="text-sm font-medium">Este concurso é seu.</p>
        <p className="text-sm text-muted-foreground">
          Quem abrir este link vê esta pré-visualização e pode copiar a
          estrutura para a própria conta.
        </p>
      </section>
    );
  }

  const copiou = await jaCopiou(userId, estrutura.compartilhamentoId);
  return (
    <section className="space-y-3 rounded-xl border p-4">
      {copiou && (
        <p className="text-sm">
          Você já copiou esta estrutura. Copiar de novo cria outro concurso na
          sua conta.
        </p>
      )}
      <CopiarEstrutura token={token} jaCopiou={copiou} />
      {aviso}
    </section>
  );
}
