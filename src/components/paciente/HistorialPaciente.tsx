"use client";

import { useState, type ReactNode } from "react";
import { HeartMark } from "@/components/ui/HeartMark";

export interface PanelHistorial {
  clave: string;
  etiqueta: string;
  contenido: ReactNode;
}

export function HistorialPaciente({ paneles }: { paneles: PanelHistorial[] }) {
  const [activo, setActivo] = useState(paneles[0]?.clave ?? "");

  if (paneles.length === 0) return null;

  return (
    <section id="historial" className="scroll-mt-24">
      <div className="mb-4 flex items-center gap-2 text-sm text-rosa-medio">
        <HeartMark className="h-4 w-4" />
        <span>Historial del paciente</span>
      </div>

      {/* Pestañas */}
      <div className="mb-4 flex flex-wrap gap-1.5 rounded-full border border-[var(--borde)] bg-[var(--superficie)] p-1.5">
        {paneles.map((p) => {
          const on = p.clave === activo;
          return (
            <button
              key={p.clave}
              onClick={() => setActivo(p.clave)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                on
                  ? "bg-[linear-gradient(120deg,var(--rosa-principal),var(--rosa-medio))] text-white shadow-tarjeta"
                  : "text-texto-secundario hover:text-rosa-principal"
              }`}
            >
              {p.etiqueta}
            </button>
          );
        })}
      </div>

      {/* Paneles (montados; se alternan con hidden para preservar estado) */}
      {paneles.map((p) => (
        <div key={p.clave} hidden={p.clave !== activo}>
          {p.contenido}
        </div>
      ))}
    </section>
  );
}
