"use client";

import { Falha } from "@/components/layout/falha";

export default function ErroApp(props: { error: unknown; retry: () => void }) {
  return <Falha {...props} />;
}
