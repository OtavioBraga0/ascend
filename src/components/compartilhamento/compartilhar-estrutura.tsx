"use client";

import { Check, Copy, Link2Off, Share2 } from "lucide-react";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { chamarAction } from "@/lib/chamar-action";
import {
  compartilharAction,
  pararCompartilhamentoAction,
} from "@/server/actions/compartilhamento";
import type { Compartilhamento } from "@/server/data/compartilhamento";

const nenhumaAssinatura = () => () => {};

/** Link, botões de compartilhar e o contador de cópias, nos ajustes. */
export function CompartilharEstrutura({
  concursoId,
  nome,
  compartilhamento,
}: {
  concursoId: string;
  nome: string;
  compartilhamento: Compartilhamento | null;
}) {
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string>();
  const [copiado, setCopiado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  // Só existem no navegador; no servidor o link sai sem domínio e sem o
  // botão de compartilhamento nativo.
  const origem = useSyncExternalStore(
    nenhumaAssinatura,
    () => location.origin,
    () => "",
  );
  const podeCompartilhar = useSyncExternalStore(
    nenhumaAssinatura,
    () => typeof navigator.share === "function",
    () => false,
  );

  // O card de conquista do painel leva a `#compartilhar`. A seção chega por
  // streaming, depois de o navegador processar a âncora, então rola aqui.
  useEffect(() => {
    if (location.hash === "#compartilhar")
      document.getElementById("compartilhar")?.scrollIntoView();
  }, []);

  useEffect(() => {
    if (!copiado) return;
    const timer = setTimeout(() => setCopiado(false), 3000);
    return () => clearTimeout(timer);
  }, [copiado]);

  const ativo = compartilhamento?.ativo ? compartilhamento : null;
  const link = ativo ? `${origem}/c/${ativo.token}` : "";

  function executar(acao: () => Promise<{ error?: string }>) {
    setErro(undefined);
    startTransition(async () => {
      const resultado = await chamarAction(acao);
      if (resultado.error) setErro(resultado.error);
      else setConfirmando(false);
    });
  }

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
    } catch {
      setErro("Não foi possível copiar. Selecione o link e copie à mão.");
    }
  }

  async function compartilhar() {
    try {
      await navigator.share({
        title: nome,
        text: `Estrutura de estudos para ${nome} no Ascend`,
        url: link,
      });
    } catch {
      // Cancelar a folha de compartilhamento também cai aqui; não é erro.
    }
  }

  const copias = compartilhamento?.copias ?? 0;

  return (
    <div className="space-y-3">
      {ativo ? (
        <>
          <Input
            readOnly
            value={link}
            aria-label="Link de compartilhamento"
            onFocus={(e) => e.currentTarget.select()}
            className="h-11 text-base md:text-sm"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            {podeCompartilhar && (
              <Button size="lg" className="h-11" onClick={compartilhar}>
                <Share2 aria-hidden />
                Compartilhar
              </Button>
            )}
            <Button
              variant={podeCompartilhar ? "outline" : "default"}
              size="lg"
              className="h-11"
              onClick={copiarLink}
            >
              {copiado ? <Check aria-hidden /> : <Copy aria-hidden />}
              {copiado ? "Link copiado" : "Copiar link"}
            </Button>
          </div>
        </>
      ) : (
        <Button
          size="lg"
          className="h-11 w-full sm:w-auto"
          disabled={pending}
          onClick={() => executar(() => compartilharAction(concursoId))}
        >
          <Share2 aria-hidden />
          {pending ? "Gerando link…" : "Compartilhar"}
        </Button>
      )}

      {compartilhamento && (
        <p className="text-sm text-muted-foreground">
          {copias === 0
            ? "Ninguém copiou ainda."
            : `Copiada por ${copias} ${copias === 1 ? "pessoa" : "pessoas"}.`}
        </p>
      )}

      <p role="status" aria-live="polite" className="sr-only">
        {copiado ? "Link copiado." : ""}
      </p>
      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}

      {ativo && (
        <AlertDialog open={confirmando} onOpenChange={setConfirmando}>
          <AlertDialogTrigger
            render={
              <Button
                variant="ghost"
                className="h-11 px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
              />
            }
          >
            <Link2Off aria-hidden />
            Parar de compartilhar
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Parar de compartilhar?</AlertDialogTitle>
              <AlertDialogDescription>
                O link atual deixa de funcionar. Quem já copiou mantém a cópia.
                Se você compartilhar de novo, um link novo será gerado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
              <Button
                variant="destructive"
                disabled={pending}
                onClick={() =>
                  executar(() => pararCompartilhamentoAction(concursoId))
                }
              >
                {pending ? "Parando…" : "Parar de compartilhar"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
