import { unstable_rethrow } from "next/navigation";

const SEM_CONEXAO =
  "Não foi possível conectar. Verifique sua internet e tente de novo.";

/**
 * Chama uma Server Action que devolve `{ error? }` e converte falhas de rede
 * (sem conexão, servidor fora do ar) em erro amigável, em vez de quebrar a tela.
 * Redirecionamentos feitos pela action seguem normalmente.
 */
export async function chamarAction(
  action: () => Promise<{ error?: string } | void>,
): Promise<{ error?: string }> {
  try {
    return (await action()) ?? {};
  } catch (erro) {
    unstable_rethrow(erro);
    console.error(erro);
    return { error: SEM_CONEXAO };
  }
}
