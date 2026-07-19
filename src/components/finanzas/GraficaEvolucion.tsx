"use client";

import { useEffect, useId, useRef, useState } from "react";
import { formatearRD } from "@/lib/finanzas";

export interface PuntoMes {
  etiqueta: string;
  ingresos: number;
  egresos: number;
  margen: number;
}

const VERDE = "#4CAF82";
const ROJO = "#E0567A";
const ROSA = "#c25a82";

/** RD$ compacto para ejes: RD$1.2k / RD$1.5M. */
function rdCorto(n: number): string {
  if (n >= 1_000_000) return `RD$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `RD$${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return `RD$${Math.round(n)}`;
}

/**
 * Evolución mensual de ingresos y egresos (áreas) con la tendencia del margen (línea).
 * SVG puro, sin dependencias; legible en claro y oscuro vía variables de tema.
 */
export function GraficaEvolucion({ datos }: { datos: PuntoMes[] }) {
  const uid = useId().replace(/[:]/g, "");
  const [montado, setMontado] = useState(false);
  const [activo, setActivo] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setMontado(true), 80);
    return () => clearTimeout(t);
  }, []);

  const W = 760;
  const H = 300;
  const padL = 56;
  const padR = 46;
  const padT = 20;
  const padB = 42;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const n = datos.length;

  const maxDinero = Math.max(1, ...datos.map((d) => Math.max(d.ingresos, d.egresos)));
  const margenes = datos.map((d) => d.margen);
  const minMar = Math.min(0, ...margenes);
  const maxMar = Math.max(10, ...margenes);

  const x = (i: number) => padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yDinero = (v: number) => padT + plotH * (1 - v / maxDinero);
  const yMargen = (v: number) =>
    padT + plotH * (1 - (v - minMar) / Math.max(1, maxMar - minMar));

  const areaPath = (sel: (d: PuntoMes) => number) => {
    if (n === 0) return "";
    const top = datos.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${yDinero(sel(d)).toFixed(1)}`).join(" ");
    return `${top} L ${x(n - 1).toFixed(1)} ${(padT + plotH).toFixed(1)} L ${x(0).toFixed(1)} ${(padT + plotH).toFixed(1)} Z`;
  };
  const linePath = (sel: (d: PuntoMes) => number, y: (v: number) => number) =>
    datos.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(sel(d)).toFixed(1)}`).join(" ");

  // Ticks del eje Y (dinero): 0, ½, max
  const ticks = [0, maxDinero / 2, maxDinero];

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - padL) / plotW) * (n - 1));
    setActivo(Math.max(0, Math.min(n - 1, i)));
  }

  const dActivo = activo != null ? datos[activo] : null;

  return (
    <div className="w-full">
      {/* Leyenda */}
      <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-texto-secundario">
        <Leyenda color={VERDE} texto="Ingresos" />
        <Leyenda color={ROJO} texto="Egresos" />
        <Leyenda color={ROSA} texto="Margen %" guion />
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: "auto" }}
          onPointerMove={onMove}
          onPointerLeave={() => setActivo(null)}
          role="img"
          aria-label="Evolución mensual de ingresos, egresos y margen"
        >
          <defs>
            <linearGradient id={`ing-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={VERDE} stopOpacity="0.42" />
              <stop offset="100%" stopColor={VERDE} stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id={`gas-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ROJO} stopOpacity="0.30" />
              <stop offset="100%" stopColor={ROJO} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid + etiquetas Y (dinero) */}
          {ticks.map((t, i) => (
            <g key={i}>
              <line
                x1={padL}
                y1={yDinero(t)}
                x2={W - padR}
                y2={yDinero(t)}
                stroke="var(--borde)"
                strokeWidth="1"
              />
              <text x={padL - 8} y={yDinero(t) + 3} textAnchor="end" fontSize="10" fill="var(--texto-secundario)">
                {rdCorto(t)}
              </text>
            </g>
          ))}

          {/* Áreas */}
          <path
            d={areaPath((d) => d.egresos)}
            fill={`url(#gas-${uid})`}
            style={{ opacity: montado ? 1 : 0, transition: "opacity 800ms ease 120ms" }}
          />
          <path
            d={areaPath((d) => d.ingresos)}
            fill={`url(#ing-${uid})`}
            style={{ opacity: montado ? 1 : 0, transition: "opacity 800ms ease" }}
          />

          {/* Líneas dinero */}
          <path d={linePath((d) => d.egresos, yDinero)} fill="none" stroke={ROJO} strokeWidth="2" strokeLinejoin="round" />
          <path d={linePath((d) => d.ingresos, yDinero)} fill="none" stroke={VERDE} strokeWidth="2.5" strokeLinejoin="round" />

          {/* Línea de margen (eje derecho) */}
          <path
            d={linePath((d) => d.margen, yMargen)}
            fill="none"
            stroke={ROSA}
            strokeWidth="1.8"
            strokeDasharray="5 4"
            strokeLinejoin="round"
          />
          {/* Eje derecho: margen */}
          <text x={W - padR + 8} y={yMargen(maxMar) + 3} fontSize="10" fill="var(--texto-secundario)">
            {maxMar}%
          </text>
          <text x={W - padR + 8} y={yMargen(minMar) + 3} fontSize="10" fill="var(--texto-secundario)">
            {minMar}%
          </text>

          {/* Etiquetas X */}
          {datos.map((d, i) => (
            <text
              key={i}
              x={x(i)}
              y={H - padB + 16}
              textAnchor="middle"
              fontSize="9.5"
              fill="var(--texto-secundario)"
              style={{ fontWeight: activo === i ? 700 : 400 }}
            >
              {d.etiqueta}
            </text>
          ))}

          {/* Guía + puntos del mes activo */}
          {dActivo && activo != null && (
            <g>
              <line x1={x(activo)} y1={padT} x2={x(activo)} y2={padT + plotH} stroke="var(--rosa-hover)" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx={x(activo)} cy={yDinero(dActivo.ingresos)} r="4" fill={VERDE} stroke="var(--superficie)" strokeWidth="1.5" />
              <circle cx={x(activo)} cy={yDinero(dActivo.egresos)} r="4" fill={ROJO} stroke="var(--superficie)" strokeWidth="1.5" />
            </g>
          )}
        </svg>

        {/* Tooltip */}
        {dActivo && activo != null && (
          <div
            className="pointer-events-none absolute top-0 z-10 min-w-[150px] rounded-suave border border-[var(--borde)] bg-[var(--superficie)] p-2.5 text-xs shadow-tarjeta"
            style={{
              left: `${(x(activo) / W) * 100}%`,
              transform: `translateX(${activo > n / 2 ? "-110%" : "10%"})`,
            }}
          >
            <p className="mb-1 font-semibold text-texto-principal">{dActivo.etiqueta}</p>
            <p className="flex items-center justify-between gap-3">
              <span style={{ color: VERDE }}>Ingresos</span>
              <span className="font-medium text-texto-principal">{formatearRD(dActivo.ingresos)}</span>
            </p>
            <p className="flex items-center justify-between gap-3">
              <span style={{ color: ROJO }}>Egresos</span>
              <span className="font-medium text-texto-principal">{formatearRD(dActivo.egresos)}</span>
            </p>
            <p className="mt-0.5 flex items-center justify-between gap-3 border-t border-[var(--borde)] pt-0.5">
              <span style={{ color: ROSA }}>Margen</span>
              <span className="font-medium text-texto-principal">{dActivo.margen}%</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Leyenda({ color, texto, guion }: { color: string; texto: string; guion?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block h-2.5 rounded-full"
        style={{ width: 16, background: guion ? `repeating-linear-gradient(90deg, ${color} 0 5px, transparent 5px 9px)` : color }}
      />
      {texto}
    </span>
  );
}
