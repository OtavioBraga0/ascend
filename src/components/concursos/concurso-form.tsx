"use client";

import { Check } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CORES, CORES_IDS } from "@/lib/cores";
import type { ConcursoFormValues } from "@/lib/validacao/concurso";
import { cn } from "@/lib/utils";
import type { ConcursoFormState } from "@/server/actions/concursos";

type Props = {
  action: (
    prev: ConcursoFormState,
    formData: FormData,
  ) => Promise<ConcursoFormState>;
  initialValues?: ConcursoFormValues;
  submitLabel: string;
  pendingLabel: string;
};

const VAZIO: ConcursoFormValues = {
  nome: "",
  banca: "",
  cargo: "",
  dataProva: "",
  cor: "blue",
};

export function ConcursoForm({
  action,
  initialValues = VAZIO,
  submitLabel,
  pendingLabel,
}: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  // O React reseta o formulário após a action; os valores devolvidos repõem o que foi digitado.
  const values = state.values ?? initialValues;
  const erro = (campo: keyof ConcursoFormValues) =>
    state.fieldErrors?.[campo]?.[0];

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <Campo id="nome" label="Nome do concurso" erro={erro("nome")}>
        <Input
          id="nome"
          name="nome"
          defaultValue={values.nome}
          placeholder="Ex.: Escrevente — Ministério Público"
          required
          maxLength={120}
          autoFocus={!initialValues.nome}
          {...ariaErro("nome", erro("nome"))}
          className="h-11 text-base"
        />
      </Campo>

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="banca" label="Banca" opcional erro={erro("banca")}>
          <Input
            id="banca"
            name="banca"
            defaultValue={values.banca}
            placeholder="Ex.: Vunesp"
            maxLength={80}
            {...ariaErro("banca", erro("banca"))}
            className="h-11 text-base"
          />
        </Campo>
        <Campo id="cargo" label="Cargo" opcional erro={erro("cargo")}>
          <Input
            id="cargo"
            name="cargo"
            defaultValue={values.cargo}
            placeholder="Ex.: Oficial de Promotoria"
            maxLength={80}
            {...ariaErro("cargo", erro("cargo"))}
            className="h-11 text-base"
          />
        </Campo>
      </div>

      <Campo
        id="dataProva"
        label="Data da prova"
        opcional
        erro={erro("dataProva")}
      >
        <Input
          id="dataProva"
          name="dataProva"
          type="date"
          defaultValue={values.dataProva}
          {...ariaErro("dataProva", erro("dataProva"))}
          className="h-11 text-base sm:w-56"
        />
      </Campo>

      <fieldset
        className="space-y-2"
        aria-describedby={erro("cor") ? "cor-erro" : undefined}
      >
        <legend className="mb-2 text-sm font-medium">Cor</legend>
        <div className="flex flex-wrap gap-3">
          {CORES_IDS.map((cor) => (
            <label key={cor} className="relative cursor-pointer">
              <input
                type="radio"
                name="cor"
                value={cor}
                defaultChecked={values.cor === cor}
                className="peer sr-only"
              />
              <span className="sr-only">{CORES[cor].label}</span>
              <span
                aria-hidden
                className={cn(
                  "flex size-10 items-center justify-center rounded-full text-white ring-offset-2 ring-offset-background transition-shadow",
                  "peer-checked:ring-2 peer-checked:ring-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
                  "[&>svg]:hidden peer-checked:[&>svg]:block",
                  CORES[cor].fundo,
                )}
              >
                <Check className="size-5" />
              </span>
            </label>
          ))}
        </div>
        {erro("cor") && (
          <MensagemErro id="cor-erro">{erro("cor")}</MensagemErro>
        )}
      </fieldset>

      {state.error && <MensagemErro>{state.error}</MensagemErro>}
      {state.savedAt && !state.error && (
        <p role="status" className="text-sm text-muted-foreground">
          Alterações salvas.
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="h-11 w-full sm:w-auto"
        disabled={pending}
      >
        {pending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}

function ariaErro(campo: string, erro: string | undefined) {
  return {
    "aria-invalid": !!erro,
    "aria-describedby": erro ? `${campo}-erro` : undefined,
  };
}

function Campo({
  id,
  label,
  opcional,
  erro,
  children,
}: {
  id: string;
  label: string;
  opcional?: boolean;
  erro?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {opcional && (
          <span className="font-normal text-muted-foreground">(opcional)</span>
        )}
      </Label>
      {children}
      {erro && <MensagemErro id={`${id}-erro`}>{erro}</MensagemErro>}
    </div>
  );
}

function MensagemErro({
  id,
  children,
}: {
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <p id={id} role="alert" className="text-sm text-destructive">
      {children}
    </p>
  );
}
