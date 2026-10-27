"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

import {
  STATUS_COR,
  STATUS_INFO,
  STATUS_ORDEM,
  type StatusTopico,
} from "@/lib/status";
import { cn } from "@/lib/utils";

export type LinhaMateria = {
  id: string;
  nome: string;
  percentual: number;
  total: number;
} & Record<StatusTopico, number>;

// Empilhamento a partir da base: o que está mais avançado vem primeiro.
const PILHA: StatusTopico[] = [
  "REVISADO",
  "EXERCICIOS",
  "TEORIA",
  "NAO_INICIADO",
];

const ALTURA_LINHA = 52;
const ESPESSURA_BARRA = 16;
const RAIO_PONTA = 4;
const ESPACO_SEGMENTOS = 2;
const LARGURA_PERCENTUAL = 44;

/** Barras horizontais por matéria, empilhadas por status. Tocar leva ao edital. */
export function BarrasMaterias({
  concursoId,
  linhas,
}: {
  concursoId: string;
  linhas: LinhaMateria[];
}) {
  const router = useRouter();
  const [ref, largura] = useLargura<HTMLDivElement>();
  const abrir = (materiaId: string) =>
    router.push(`/concursos/${concursoId}/edital?materia=${materiaId}`);

  return (
    <div className="space-y-4">
      <Legenda />
      <div ref={ref} className="cursor-pointer" aria-hidden>
        {largura > 0 && (
          <BarChart
            // Oculto para leitores de tela: a tabela abaixo é a alternativa acessível.
            accessibilityLayer={false}
            width={largura}
            height={linhas.length * ALTURA_LINHA}
            data={linhas}
            layout="vertical"
            barSize={ESPESSURA_BARRA}
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
            onClick={(estado) => {
              const indice = Number(estado?.activeTooltipIndex);
              if (Number.isInteger(indice) && linhas[indice])
                abrir(linhas[indice].id);
            }}
          >
            <XAxis type="number" hide domain={[0, "dataMax"]} />
            <YAxis
              type="category"
              dataKey="id"
              width={1}
              axisLine={false}
              tickLine={false}
              tick={(props) => (
                <RotuloLinha {...props} linhas={linhas} largura={largura} />
              )}
            />
            <Tooltip
              content={(props) => <Dica {...props} />}
              cursor={{ fill: "var(--muted)", opacity: 0.6 }}
              isAnimationActive={false}
            />
            {PILHA.map((status) => (
              <Bar
                key={status}
                dataKey={status}
                stackId="status"
                isAnimationActive={false}
                shape={(props: SegmentoProps) => (
                  <Segmento {...props} status={status} />
                )}
              />
            ))}
          </BarChart>
        )}
      </div>
      <TabelaMaterias concursoId={concursoId} linhas={linhas} />
    </div>
  );
}

function Legenda() {
  return (
    <ul
      className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"
      aria-label="Legenda"
    >
      {[...PILHA].map((status) => (
        <li key={status} className="flex items-center gap-1.5">
          <span
            className={cn("size-2.5 rounded-sm", STATUS_INFO[status].ponto)}
            aria-hidden
          />
          {STATUS_INFO[status].label}
        </li>
      ))}
    </ul>
  );
}

/** Nome da matéria acima da barra e percentual à direita. */
function RotuloLinha({
  y,
  payload,
  linhas,
  largura,
}: {
  y?: number | string;
  payload?: { value: string };
  linhas: LinhaMateria[];
  largura: number;
}) {
  const linha = linhas.find((l) => l.id === payload?.value);
  if (!linha || y === undefined) return null;
  const topo = Number(y) - ESPESSURA_BARRA / 2 - 8;
  // Estimativa de ~7px por caractere em 13px; o nome completo fica na dica e na tabela.
  const maxCaracteres = Math.max(
    8,
    Math.floor((largura - LARGURA_PERCENTUAL) / 7),
  );
  const nome =
    linha.nome.length > maxCaracteres
      ? `${linha.nome.slice(0, maxCaracteres - 1)}…`
      : linha.nome;
  return (
    <g>
      <text x={0} y={topo} fontSize={13} fill="var(--foreground)">
        {nome}
      </text>
      <text
        x={largura}
        y={topo}
        fontSize={13}
        fontWeight={600}
        textAnchor="end"
        fill="var(--foreground)"
      >
        {linha.percentual}%
      </text>
    </g>
  );
}

type SegmentoProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: LinhaMateria;
};

/** Segmento da pilha: ponta arredondada só no fim do dado, reto na base; 2px de respiro entre segmentos. */
function Segmento({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  payload,
  status,
}: SegmentoProps & { status: StatusTopico }) {
  if (!payload || width <= 0) return null;
  const ultimo = [...PILHA].reverse().find((s) => payload[s] > 0) === status;
  const largura = ultimo ? width : Math.max(width - ESPACO_SEGMENTOS, 1);
  const r = ultimo ? Math.min(RAIO_PONTA, largura / 2, height / 2) : 0;
  const d = [
    `M${x},${y}`,
    `h${largura - r}`,
    r ? `a${r},${r} 0 0 1 ${r},${r}` : "",
    `v${height - 2 * r}`,
    r ? `a${r},${r} 0 0 1 ${-r},${r}` : "",
    `h${-(largura - r)}`,
    "Z",
  ].join(" ");
  return <path d={d} fill={STATUS_COR[status]} />;
}

function Dica({
  active,
  payload,
}: Partial<TooltipContentProps<ValueType, NameType>>) {
  const linha = payload?.[0]?.payload as LinhaMateria | undefined;
  if (!active || !linha) return null;
  return (
    <div className="max-w-64 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="mb-1.5 font-medium">{linha.nome}</p>
      <ul className="space-y-1">
        {PILHA.map((status) => (
          <li key={status} className="flex items-center gap-2">
            <span
              className={cn("size-2.5 rounded-sm", STATUS_INFO[status].ponto)}
              aria-hidden
            />
            <span className="flex-1 text-muted-foreground">
              {STATUS_INFO[status].label}
            </span>
            <span className="tabular-nums">{linha[status]}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-muted-foreground">Toque para abrir no edital</p>
    </div>
  );
}

/** Visão em tabela: acessível por teclado e leitor de tela, e com os números exatos. */
function TabelaMaterias({
  concursoId,
  linhas,
}: {
  concursoId: string;
  linhas: LinhaMateria[];
}) {
  return (
    <details className="group text-sm">
      <summary className="cursor-pointer rounded-md py-1 text-muted-foreground outline-none select-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
        Ver em tabela
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <caption className="sr-only">
            Tópicos por status em cada matéria
          </caption>
          <thead className="text-muted-foreground">
            <tr className="border-b">
              <th scope="col" className="py-2 pr-2 font-medium">
                Matéria
              </th>
              {STATUS_ORDEM.map((status) => (
                <th
                  key={status}
                  scope="col"
                  className="px-1 py-2 text-right font-medium"
                >
                  {STATUS_INFO[status].label}
                </th>
              ))}
              <th scope="col" className="py-2 pl-1 text-right font-medium">
                Progresso
              </th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {linhas.map((linha) => (
              <tr key={linha.id} className="border-b last:border-0">
                <th scope="row" className="py-2 pr-2 font-normal">
                  <Link
                    href={`/concursos/${concursoId}/edital?materia=${linha.id}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {linha.nome}
                  </Link>
                </th>
                {STATUS_ORDEM.map((status) => (
                  <td key={status} className="px-1 py-2 text-right">
                    {linha[status]}
                  </td>
                ))}
                <td className="py-2 pl-1 text-right">{linha.percentual}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function useLargura<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [largura, setLargura] = useState(0);
  useEffect(() => {
    const elemento = ref.current;
    if (!elemento) return;
    const observer = new ResizeObserver(([entrada]) =>
      setLargura(Math.floor(entrada.contentRect.width)),
    );
    observer.observe(elemento);
    return () => observer.disconnect();
  }, []);
  return [ref, largura] as const;
}
