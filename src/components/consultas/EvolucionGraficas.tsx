"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import { formatearFecha } from "@/lib/formato";
import type { PuntoEvolucion } from "@/lib/consultas";

interface Serie {
  nombre: string;
  color: string;
  valores: (number | null)[];
}

const ANCHO = 320;
const ALTO = 120;
const PAD = { top: 14, right: 10, bottom: 20, left: 30 };

function MiniGrafico({
  fechas,
  series,
  unidad,
}: {
  fechas: string[];
  series: Serie[];
  unidad: string;
}) {
  const uid = useId().replace(/:/g, "");

  // Rango Y a partir de todos los valores presentes (con margen).
  const todos = series.flatMap((s) => s.valores.filter((v): v is number => v !== null));
  if (todos.length === 0) return null;
  let min = Math.min(...todos);
  let max = Math.max(...todos);
  if (min === max) {
    min -= 5;
    max += 5;
  }
  const margen = (max - min) * 0.15;
  min -= margen;
  max += margen;

  const n = fechas.length;
  const x = (i: number) =>
    n <= 1
      ? PAD.left + (ANCHO - PAD.left - PAD.right) / 2
      : PAD.left + (i * (ANCHO - PAD.left - PAD.right)) / (n - 1);
  const y = (v: number) =>
    PAD.top + (1 - (v - min) / (max - min)) * (ALTO - PAD.top - PAD.bottom);

  function pathDe(valores: (number | null)[]): string {
    const pts = valores
      .map((v, i) => (v === null ? null : `${x(i)},${y(v)}`))
      .filter((p): p is string => p !== null);
    if (pts.length === 0) return "";
    return "M" + pts.join(" L");
  }

  // Etiquetas de fecha: primera y última.
  const etiquetas =
    n <= 1
      ? [{ i: 0, txt: formatearFecha(fechas[0]!) }]
      : [
          { i: 0, txt: formatearFecha(fechas[0]!) },
          { i: n - 1, txt: formatearFecha(fechas[n - 1]!) },
        ];

  return (
    <svg
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      className="h-auto w-full"
      role="img"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* rejilla horizontal */}
      {[0, 0.5, 1].map((t) => {
        const yy = PAD.top + t * (ALTO - PAD.top - PAD.bottom);
        const val = Math.round(max - t * (max - min));
        return (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={ANCHO - PAD.right}
              y1={yy}
              y2={yy}
              stroke="var(--borde)"
              strokeWidth={1}
              strokeDasharray="3 4"
            />
            <text x={2} y={yy + 3} fontSize={8} fill="var(--texto-secundario)">
              {val}
            </text>
          </g>
        );
      })}

      {series.map((s, si) => {
        const d = pathDe(s.valores);
        if (!d) return null;
        return (
          <g key={s.nombre}>
            <defs>
              <linearGradient id={`grad-${uid}-${si}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.22" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* área bajo la curva */}
            {s.valores.filter((v) => v !== null).length > 1 && (
              <motion.path
                d={`${d} L${x(lastIndex(s.valores))},${ALTO - PAD.bottom} L${x(firstIndex(s.valores))},${ALTO - PAD.bottom} Z`}
                fill={`url(#grad-${uid}-${si})`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              />
            )}
            {/* línea */}
            <motion.path
              d={d}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.9, ease: "easeInOut", delay: 0.1 * si }}
            />
            {/* puntos */}
            {s.valores.map((v, i) =>
              v === null ? null : (
                <motion.circle
                  key={i}
                  cx={x(i)}
                  cy={y(v)}
                  r={2.6}
                  fill={s.color}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                />
              ),
            )}
          </g>
        );
      })}

      {etiquetas.map((e) => (
        <text
          key={e.i}
          x={x(e.i)}
          y={ALTO - 6}
          fontSize={8}
          fill="var(--texto-secundario)"
          textAnchor={e.i === 0 ? "start" : "end"}
        >
          {e.txt}
        </text>
      ))}

      <text x={ANCHO - PAD.right} y={10} fontSize={8} fill="var(--texto-secundario)" textAnchor="end">
        {unidad}
      </text>
    </svg>
  );
}

function firstIndex(v: (number | null)[]): number {
  return v.findIndex((x) => x !== null);
}
function lastIndex(v: (number | null)[]): number {
  for (let i = v.length - 1; i >= 0; i--) if (v[i] !== null) return i;
  return 0;
}

export function EvolucionGraficas({ serie }: { serie: PuntoEvolucion[] }) {
  const conTA = serie.some((p) => p.sistolica !== null || p.diastolica !== null);
  const conFC = serie.some((p) => p.fc !== null);
  if (!conTA && !conFC) return null;

  const fechas = serie.map((p) => p.fecha);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {conTA && (
        <div className="rounded-suave border border-[var(--borde)] p-4">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-sm font-medium text-texto-principal">Presión arterial</p>
            <div className="flex items-center gap-3 text-[11px] text-texto-secundario">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#B14A73" }} />
                Sistólica
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#E87FA6" }} />
                Diastólica
              </span>
            </div>
          </div>
          <MiniGrafico
            fechas={fechas}
            unidad="mmHg"
            series={[
              { nombre: "Sistólica", color: "#B14A73", valores: serie.map((p) => p.sistolica) },
              { nombre: "Diastólica", color: "#E87FA6", valores: serie.map((p) => p.diastolica) },
            ]}
          />
        </div>
      )}
      {conFC && (
        <div className="rounded-suave border border-[var(--borde)] p-4">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-sm font-medium text-texto-principal">Frecuencia cardíaca</p>
            <span className="flex items-center gap-1 text-[11px] text-texto-secundario">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#C25A82" }} />
              lpm
            </span>
          </div>
          <MiniGrafico
            fechas={fechas}
            unidad="lpm"
            series={[{ nombre: "FC", color: "#C25A82", valores: serie.map((p) => p.fc) }]}
          />
        </div>
      )}
    </div>
  );
}
