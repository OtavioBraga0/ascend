import { cn } from "@/lib/utils";

type Props = {
  /** Progresso de 0 a 1. */
  valor: number;
  tamanho?: number;
  espessura?: number;
  /** Classe de stroke da cor do concurso, ex.: "stroke-blue-500". */
  traco: string;
  rotulo: string;
  children?: React.ReactNode;
};

/** Anel de progresso em SVG (sem JavaScript no cliente). */
export function AnelProgresso({
  valor,
  tamanho = 48,
  espessura = 5,
  traco,
  rotulo,
  children,
}: Props) {
  const raio = (tamanho - espessura) / 2;
  const circunferencia = 2 * Math.PI * raio;
  const progresso = Math.min(1, Math.max(0, valor));

  return (
    <div
      role="img"
      aria-label={rotulo}
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: tamanho, height: tamanho }}
    >
      <svg
        width={tamanho}
        height={tamanho}
        viewBox={`0 0 ${tamanho} ${tamanho}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          fill="none"
          strokeWidth={espessura}
          className="stroke-muted"
        />
        {progresso > 0 && (
          <circle
            cx={tamanho / 2}
            cy={tamanho / 2}
            r={raio}
            fill="none"
            strokeWidth={espessura}
            strokeLinecap="round"
            strokeDasharray={circunferencia}
            strokeDashoffset={circunferencia * (1 - progresso)}
            className={cn(traco)}
          />
        )}
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center"
        aria-hidden
      >
        {children}
      </span>
    </div>
  );
}
