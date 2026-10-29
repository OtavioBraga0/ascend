"use client";

import {
  CalendarDays,
  ChartPie,
  ListChecks,
  Trophy,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useSyncExternalStore } from "react";

import {
  activeNavKey,
  concursoIdFromPath,
  concursoPadrao,
  navHrefs,
  type NavKey,
} from "@/lib/navigation";
import { cn } from "@/lib/utils";

const ITEMS: { key: NavKey; label: string; icon: LucideIcon }[] = [
  { key: "concursos", label: "Concursos", icon: Trophy },
  { key: "painel", label: "Painel", icon: ChartPie },
  { key: "agenda", label: "Agenda", icon: CalendarDays },
  { key: "edital", label: "Edital", icon: ListChecks },
  { key: "conta", label: "Conta", icon: UserRound },
];

const CHAVE_ULTIMO = "ascend:ultimo-concurso";

// O armazenamento pode falhar (aba privada, dados bloqueados): sem ele, a
// navegação só não lembra o último concurso.
function lerUltimo(): string | null {
  try {
    return localStorage.getItem(CHAVE_ULTIMO);
  } catch {
    return null;
  }
}

function assinarStorage(aviso: () => void) {
  window.addEventListener("storage", aviso);
  return () => window.removeEventListener("storage", aviso);
}

/**
 * Barra inferior no celular; barra lateral a partir de `md`. `concursoIds`
 * (do usuário) permite apontar Painel, Agenda e Edital para um concurso
 * mesmo fora dele.
 */
export function AppNav({ concursoIds = [] }: { concursoIds?: string[] }) {
  return (
    <Suspense fallback={<NavBar pathname={null} padrao={null} />}>
      <CurrentNavBar concursoIds={concursoIds} />
    </Suspense>
  );
}

function CurrentNavBar({ concursoIds }: { concursoIds: string[] }) {
  const pathname = usePathname();
  const ultimo = useSyncExternalStore(assinarStorage, lerUltimo, () => null);
  const atual = concursoIdFromPath(pathname);

  useEffect(() => {
    if (!atual) return;
    try {
      localStorage.setItem(CHAVE_ULTIMO, atual);
    } catch {}
  }, [atual]);

  return (
    <NavBar
      pathname={pathname}
      padrao={concursoPadrao(concursoIds, atual ?? ultimo)}
    />
  );
}

function NavBar({
  pathname,
  padrao,
}: {
  pathname: string | null;
  padrao: string | null;
}) {
  const hrefs = navHrefs(pathname ?? "", padrao);
  const active = pathname ? activeNavKey(pathname) : null;

  return (
    <nav
      aria-label="Navegação principal"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur",
        "md:inset-y-0 md:right-auto md:w-60 md:border-t-0 md:border-r md:pb-0",
      )}
    >
      <p className="hidden px-6 pt-6 pb-4 text-xl font-semibold tracking-tight md:block">
        Ascend
      </p>
      <ul className="grid grid-cols-5 md:flex md:flex-col md:gap-1 md:px-3">
        {ITEMS.map(({ key, label, icon: Icon }) => {
          const isActive = key === active;
          return (
            <li key={key}>
              <Link
                href={hrefs[key]}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground transition-colors outline-none",
                  "focus-visible:bg-muted focus-visible:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset",
                  "md:h-10 md:flex-row md:justify-start md:gap-3 md:rounded-lg md:px-3 md:text-sm md:hover:bg-muted",
                  isActive && "text-foreground md:bg-muted",
                )}
              >
                <Icon className="size-5 md:size-4" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
