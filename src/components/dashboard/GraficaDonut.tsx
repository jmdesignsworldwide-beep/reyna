"use client";

import { useEffect, useState } from "react";
import { Contador } from "@/components/dashboard/Contador";

export interface Segmento {
  etiqueta: string;
  valor: number;
  color: string;
}

export function GraficaDonut({
  segmentos,
  titulo,
  etiquetaCentro = "total",
}: {
  segmentos: Segmento[];
  titulo?: string;
  etiquetaCentro?: string;
}) {
  const [montado, setMontado] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMontado(true), 60);
    return () => clearTimeout(t);
  }, []);

  const total = segmentos.reduce((s, x) => s + x.valor, 0);
  const R = 62;
  const C = 2 * Math.PI * R;
  const gap = 2.5; // separación entre segmentos (en unidades de circunferencia)

  let acumulado = 0;
  const arcos = segmentos
    .filter((s) => s.valor > 0)
    .map((s) => {
      const frac = total > 0 ? s.valor / total : 0;
      const largo = Math.max(frac * C - gap, 0);
      const offset = acumulado;
      acumulado += frac * C;
      return { ...s, largo, offset };
    });

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-7">
      <div className="relative flex-none">
        <svg width="160" height="160" viewBox="0 0 160 160" className="-rotate-90">
          <circle cx="80" cy="80" r={R} fill="none" stroke="var(--borde)" strokeWidth="14" />
          {arcos.map((a, i) => (
            <circle
              key={i}
              cx="80"
              cy="80"
              r={R}
              fill="none"
              stroke={a.color}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${montado ? a.largo : 0} ${C}`}
              strokeDashoffset={-a.offset}
              style={{ transition: "stroke-dasharray 900ms cubic-bezier(0.22,1,0.36,1)", transitionDelay: `${i * 120}ms` }}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl font-semibold text-texto-principal">
            <Contador valor={total} />
          </span>
          <span className="text-[11px] uppercase tracking-wide text-texto-secundario">
            {etiquetaCentro}
          </span>
        </div>
      </div>

      <ul className="w-full space-y-2">
        {segmentos.map((s) => (
          <li key={s.etiqueta} className="flex items-center gap-2.5 text-sm">
            <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ backgroundColor: s.color }} />
            <span className="flex-1 text-texto-principal">{s.etiqueta}</span>
            <span className="font-medium text-texto-principal">{s.valor}</span>
            <span className="w-10 text-right text-xs text-texto-secundario">
              {total > 0 ? Math.round((s.valor / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
