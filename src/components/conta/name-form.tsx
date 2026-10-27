"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveName, type NameFormState } from "@/server/actions/conta";

export function NameForm({ name }: { name: string | null }) {
  const [state, formAction, pending] = useActionState<NameFormState, FormData>(
    saveName,
    {},
  );

  return (
    <form action={formAction} className="space-y-2">
      <Label htmlFor="name">Nome</Label>
      <div className="flex gap-2">
        <Input
          id="name"
          name="name"
          defaultValue={name ?? ""}
          placeholder="Como quer ser chamado"
          autoComplete="name"
          maxLength={80}
          aria-invalid={!!state.error}
          aria-describedby={state.error ? "name-error" : undefined}
          className="h-11 text-base"
        />
        <Button
          type="submit"
          variant="outline"
          className="h-11"
          disabled={pending}
        >
          {pending ? "Salvando…" : "Salvar"}
        </Button>
      </div>
      {state.error && (
        <p id="name-error" role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.savedAt && !state.error && (
        <p role="status" className="text-sm text-muted-foreground">
          Nome salvo.
        </p>
      )}
    </form>
  );
}
