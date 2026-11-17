import Link from "next/link";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";

type Props = Omit<ComponentProps<typeof Button>, "render" | "nativeButton"> &
  Pick<ComponentProps<typeof Link>, "href" | "prefetch" | "replace" | "scroll">;

/**
 * Link com a aparência de `Button`. Passa `nativeButton={false}` ao Base UI,
 * que senão espera um `<button>` e tira a semântica de link do `<a>`.
 */
export function ButtonLink({
  href,
  prefetch,
  replace,
  scroll,
  ...props
}: Props) {
  return (
    <Button
      {...props}
      nativeButton={false}
      render={
        <Link
          href={href}
          prefetch={prefetch}
          replace={replace}
          scroll={scroll}
        />
      }
    />
  );
}
