"use client";

import { Contador } from "@/components/dashboard/Contador";
import { Icono } from "@/components/panel/iconos";

export function MetricaCard({
  etiqueta,
  valor,
  detalle,
  icono,
  color = "var(--rosa-principal)",
  delay = 0,
  sufijo = "",
  decimales = 0,
}: {
  etiqueta: string;
  valor: number;
  detalle?: string;
  icono: string;
  color?: string;
  delay?: number;
  sufijo?: string;
  decimales?: number;
}) {
  return (
    <div
      className="tarjeta tarjeta-interactiva group animate-fade-up overflow-hidden !p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm text-texto-secundario">{etiqueta}</p>
        <span
          className="flex h-9 w-9 flex-none items-center justify-center rounded-full transition-transform duration-500 group-hover:scale-110"
          style={{ backgroundColor: `${color}18`, color }}
        >
          <Icono nombre={icono} className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 font-display text-4xl font-semibold leading-none" style={{ color }}>
        <Contador valor={valor} sufijo={sufijo} decimales={decimales} />
      </p>
      {detalle && <p className="mt-1.5 text-xs text-texto-secundario">{detalle}</p>}
      <div
        className="mt-4 h-1 w-full origin-left scale-x-0 rounded-full transition-transform duration-700 group-hover:scale-x-100"
        style={{ background: `linear-gradient(90deg, ${color}, transparent)` }}
      />
    </div>
  );
}
