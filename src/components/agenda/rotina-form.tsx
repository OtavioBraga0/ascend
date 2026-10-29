"use client";

import { startTransition, useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatarDuracao,
  formatarHora,
  horariosDoDia,
  type RotinaAgenda,
} from "@/lib/agenda";
import { cn } from "@/lib/utils";
import {
  DIAS_SEMANA,
  DURACOES_BLOCO,
  MINUTOS_POR_DIA,
  PAUSAS,
  ROTINA_PADRAO,
  type RotinaFormValues,
} from "@/lib/validacao/rotina";
import {
  salvarRotinaAction,
  type RotinaFormState,
} from "@/server/actions/rotina";

const SELECT =
  "h-11 w-full rounded-md border border-input bg-background px-2 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm";

function paraForm(rotina: RotinaAgenda): RotinaFormValues {
  return {
    diasSemana: rotina.diasSemana.map(String),
    inicioMinutos: formatarHora(rotina.inicioMinutos),
    minutosPorDia: String(rotina.minutosPorDia),
    duracaoBloco: String(rotina.duracaoBloco),
    pausa: String(rotina.pausa),
  };
}

/**
 * Prévia dos horários de um dia com os valores atuais do formulário, ou o
 * erro de horário que o servidor também rejeitaria.
 */
function previa(
  valores: RotinaFormValues,
): { horarios: string } | { erro: string } {
  const [h, m] = valores.inicioMinutos.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m))
    return { erro: "Informe o horário de início." };
  const horarios = horariosDoDia({
    diasSemana: [],
    inicioMinutos: h * 60 + m,
    minutosPorDia: Number(valores.minutosPorDia),
    duracaoBloco: Number(valores.duracaoBloco),
    pausa: Number(valores.pausa),
  });
  if ((horarios.at(-1)?.fim ?? 0) > 24 * 60)
    return { erro: "Com esse início, os estudos passariam da meia-noite." };
  return {
    horarios: horarios
      .map((b) => `${formatarHora(b.inicio)}–${formatarHora(b.fim)}`)
      .join(" · "),
  };
}

/** Dias da semana, horário de início, tempo por dia, bloco e pausa. */
export function RotinaForm({
  inicial,
  submitLabel = "Salvar rotina",
}: {
  inicial: RotinaAgenda | null;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState<
    RotinaFormState,
    FormData
  >(salvarRotinaAction, {});
  // Controlado para a prévia acompanhar a digitação.
  const [valores, setValores] = useState(() =>
    paraForm(inicial ?? ROTINA_PADRAO),
  );
  const erro = (campo: keyof RotinaFormValues) =>
    state.fieldErrors?.[campo]?.[0];
  const mudar = (campo: keyof RotinaFormValues, valor: string) =>
    setValores((v) => ({ ...v, [campo]: valor }));

  function alternarDia(dia: string) {
    setValores((v) => ({
      ...v,
      diasSemana: v.diasSemana.includes(dia)
        ? v.diasSemana.filter((d) => d !== dia)
        : [...v.diasSemana, dia],
    }));
  }

  const dia = previa(valores);
  // O erro detectado no cliente aparece só na caixa da prévia; o do servidor
  // continua valendo como garantia.
  const erroInicio = "erro" in dia ? dia.erro : erro("inicioMinutos");

  // Envia pelo onSubmit, e não por `<form action>`: depois de uma action o
  // React chama form.reset(), que devolve os <select> controlados ao valor da
  // montagem enquanto o estado continua com o valor escolhido.
  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={enviar} className="space-y-5" noValidate>
      <fieldset
        className="space-y-2"
        aria-describedby={erro("diasSemana") ? "dias-erro" : undefined}
      >
        <legend className="mb-2 text-sm font-medium">Dias de estudo</legend>
        <div className="grid grid-cols-7 gap-1.5">
          {DIAS_SEMANA.map((dia) => (
            <label key={dia.valor} className="relative cursor-pointer">
              <input
                type="checkbox"
                name="diasSemana"
                value={dia.valor}
                checked={valores.diasSemana.includes(String(dia.valor))}
                onChange={() => alternarDia(String(dia.valor))}
                aria-label={dia.nome}
                className="peer sr-only"
              />
              <span className="sr-only">{dia.nome}</span>
              <span
                aria-hidden
                className={cn(
                  "flex h-11 items-center justify-center rounded-lg border text-sm font-medium transition-colors",
                  "peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground",
                  "peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
                )}
              >
                {dia.curto}
              </span>
            </label>
          ))}
        </div>
        {erro("diasSemana") && (
          <MensagemErro id="dias-erro">{erro("diasSemana")}</MensagemErro>
        )}
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="inicioMinutos">Início</Label>
          <Input
            id="inicioMinutos"
            name="inicioMinutos"
            type="time"
            step={300}
            value={valores.inicioMinutos}
            onChange={(e) => mudar("inicioMinutos", e.target.value)}
            aria-invalid={!!erroInicio}
            aria-describedby={erroInicio ? "inicio-erro" : undefined}
            className="h-11 text-base"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="minutosPorDia">Tempo por dia</Label>
          <select
            id="minutosPorDia"
            name="minutosPorDia"
            value={valores.minutosPorDia}
            onChange={(e) => mudar("minutosPorDia", e.target.value)}
            className={SELECT}
          >
            {MINUTOS_POR_DIA.map((m) => (
              <option key={m} value={m}>
                {formatarDuracao(m)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="duracaoBloco">Cada matéria</Label>
          <select
            id="duracaoBloco"
            name="duracaoBloco"
            value={valores.duracaoBloco}
            onChange={(e) => mudar("duracaoBloco", e.target.value)}
            className={SELECT}
          >
            {DURACOES_BLOCO.map((m) => (
              <option key={m} value={m}>
                {formatarDuracao(m)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pausa">Pausa entre matérias</Label>
          <select
            id="pausa"
            name="pausa"
            value={valores.pausa}
            onChange={(e) => mudar("pausa", e.target.value)}
            className={SELECT}
          >
            {PAUSAS.map((m) => (
              <option key={m} value={m}>
                {m === 0 ? "Sem pausa" : formatarDuracao(m)}
              </option>
            ))}
          </select>
        </div>
      </div>
      {"horarios" in dia && erroInicio && (
        <MensagemErro id="inicio-erro">{erroInicio}</MensagemErro>
      )}

      {"horarios" in dia ? (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm">
          <span className="text-muted-foreground">Cada dia de estudo: </span>
          {dia.horarios}
        </p>
      ) : (
        <p
          id="inicio-erro"
          role="alert"
          className="rounded-lg bg-muted px-3 py-2 text-sm text-destructive"
        >
          {dia.erro}
        </p>
      )}

      {state.savedAt && !state.fieldErrors && (
        <p role="status" className="text-sm text-muted-foreground">
          Rotina salva.
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="h-11 w-full sm:w-auto"
        disabled={pending || "erro" in dia}
      >
        {pending ? "Salvando…" : submitLabel}
      </Button>
    </form>
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
