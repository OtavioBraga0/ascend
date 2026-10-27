"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useSyncExternalStore } from "react";

import { THEME_STORAGE_KEY, THEMES, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    __setTheme?: (theme: Theme) => void;
  }
}

const OPTIONS: Record<Theme, { label: string; icon: LucideIcon }> = {
  light: { label: "Claro", icon: Sun },
  dark: { label: "Escuro", icon: Moon },
  system: { label: "Sistema", icon: Monitor },
};

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return THEMES.includes(stored as Theme) ? (stored as Theme) : "system";
  } catch {
    return "system";
  }
}

function setTheme(theme: Theme) {
  window.__setTheme?.(theme);
  listeners.forEach((listener) => listener());
}

export function ThemeSelect() {
  const theme = useSyncExternalStore(
    subscribe,
    readTheme,
    () => "system" as const,
  );

  return (
    <div role="group" aria-label="Tema" className="grid grid-cols-3 gap-2">
      {THEMES.map((value) => {
        const { label, icon: Icon } = OPTIONS[value];
        const checked = theme === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={checked}
            onClick={() => setTheme(value)}
            className={cn(
              "flex h-16 flex-col items-center justify-center gap-1 rounded-lg border text-sm transition-colors outline-none",
              "focus-visible:ring-3 focus-visible:ring-ring/50",
              checked
                ? "border-primary bg-muted font-medium"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
