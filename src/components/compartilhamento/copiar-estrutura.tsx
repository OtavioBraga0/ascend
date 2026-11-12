"use client";

import { Copy } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { chamarAction } from "@/lib/chamar-action";
import { copiarEstruturaAction } from "@/server/actions/compartilhamento";

/** Botão que copia a estrutura do link para a conta de quem está vendo. */
export function CopiarEstrutura({
  token,
  jaCopiou,
}: {
  token: string;
  jaCopiou: boolean;
}) {
  const [copiando, startCopiar] = useTransition();
  const [erro, setErro] = useState<string>();

  function copiar() {
    setErro(undefined);
    startCopiar(async () => {
      const resultado = await chamarAction(() => copiarEstruturaAction(token));
      if (resultado.error) setErro(resultado.error);
    });
  }

  return (
    <div className="space-y-2">
      <Button
        size="lg"
        className="h-11 w-full sm:w-auto"
        onClick={copiar}
        disabled={copiando}
      >
        <Copy aria-hidden />
        {copiando
          ? "Copiando…"
          : jaCopiou
            ? "Copiar de novo"
            : "Copiar para minha conta"}
      </Button>
      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}
    </div>
  );
}
