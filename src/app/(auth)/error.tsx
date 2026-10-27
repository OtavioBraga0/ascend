"use client";

import { Falha } from "@/components/layout/falha";

export default function ErroAuth(props: { error: unknown; retry: () => void }) {
  return <Falha {...props} />;
}
