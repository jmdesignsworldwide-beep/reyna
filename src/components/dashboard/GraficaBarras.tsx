"use client";

import { useEffect, useState } from "react";

export interface Barra {
  etiqueta: string;
  valor: number;
  color?: string;
}

export function GraficaBarras({ items }: { items: Barra[] }) {
  const [montado, setMontado] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMontado(true), 60);
    return () => clearTimeout(t);
  }, []);

  const max = Math.max(1, ...items.map((i) => i.valor));

  if (items.every((i) => i.valor === 0)) {
    return (
      <p className="py-6 text-center text-sm text-texto-secundario">
        Sin datos suficientes todavía.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((b, i) => {
        const pct = montado ? (b.valor / max) * 100 : 0;
        const color = b.color ?? "var(--rosa-principal)";
        return (
          <li key={b.etiqueta}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-texto-principal">{b.etiqueta}</span>
              <span className="font-medium text-texto-secundario">{b.valor}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--superficie-suave)]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${color}, ${color}bb)`,
                  transition: "width 900ms cubic-bezier(0.22,1,0.36,1)",
                  transitionDelay: `${i * 90}ms`,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
