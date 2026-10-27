"use client";

import {
  ChartPie,
  ListChecks,
  Trophy,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import { activeNavKey, navHrefs, type NavKey } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const ITEMS: { key: NavKey; label: string; icon: LucideIcon }[] = [
  { key: "concursos", label: "Concursos", icon: Trophy },
  { key: "painel", label: "Painel", icon: ChartPie },
  { key: "edital", label: "Edital", icon: ListChecks },
  { key: "conta", label: "Conta", icon: UserRound },
];

/** Barra inferior no celular; barra lateral a partir de `md`. */
export function AppNav() {
  return (
    <Suspense fallback={<NavBar pathname={null} />}>
      <CurrentNavBar />
    </Suspense>
  );
}

function CurrentNavBar() {
  return <NavBar pathname={usePathname()} />;
}

function NavBar({ pathname }: { pathname: string | null }) {
  const hrefs = navHrefs(pathname ?? "");
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
      <ul className="grid grid-cols-4 md:flex md:flex-col md:gap-1 md:px-3">
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
