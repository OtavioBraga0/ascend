"use client";

import { ChevronDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STATUS_INFO, STATUS_ORDEM, type StatusTopico } from "@/lib/status";
import { cn } from "@/lib/utils";

/** Chip com o status do tópico; um toque abre o menu, outro escolhe. */
export function StatusMenu({
  status,
  titulo,
  onChange,
}: {
  status: StatusTopico;
  titulo: string;
  onChange: (status: StatusTopico) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Status de ${titulo}: ${STATUS_INFO[status].label}. Alterar`}
        className={cn(
          "inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-medium whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          STATUS_INFO[status].chip,
        )}
      >
        {STATUS_INFO[status].label}
        <ChevronDown className="size-3.5" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuRadioGroup
          value={status}
          onValueChange={(valor) => {
            if (valor !== status) onChange(valor as StatusTopico);
          }}
        >
          {STATUS_ORDEM.map((opcao) => (
            <DropdownMenuRadioItem
              key={opcao}
              value={opcao}
              closeOnClick
              className="h-10 gap-2"
            >
              <span
                className={cn(
                  "size-2.5 rounded-full",
                  STATUS_INFO[opcao].ponto,
                )}
                aria-hidden
              />
              {STATUS_INFO[opcao].label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
