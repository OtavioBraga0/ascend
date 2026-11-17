import { LinkIndisponivel } from "@/components/compartilhamento/link-indisponivel";

// Fora da raiz, `not-found` não aceita `metadata`; o noindex é automático.
export default function CompartilhadoNaoEncontrado() {
  return <LinkIndisponivel />;
}
