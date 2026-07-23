"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { Icono } from "@/components/panel/iconos";
import { formatearFecha } from "@/lib/formato";
import {
  ETIQUETA_EVENTO,
  COLOR_EVENTO,
  type EventoHistorial,
  type TipoEvento,
} from "@/lib/historial";

const TIPOS: TipoEvento[] = ["consulta", "estudio", "evaluacion", "reporte"];

export function TimelineUnificada({ eventos }: { eventos: EventoHistorial[] }) {
  const [ocultos, setOcultos] = useState<Set<TipoEvento>>(new Set());

  const conteo = useMemo(() => {
    const m: Record<TipoEvento, number> = { consulta: 0, estudio: 0, evaluacion: 0, reporte: 0 };
    for (const e of eventos) m[e.tipo]++;
    return m;
  }, [eventos]);

  const visibles = eventos.filter((e) => !ocultos.has(e.tipo));

  function alternar(t: TipoEvento) {
    setOcultos((prev) => {
      const s = new Set(prev);
      if (s.has(t)) s.delete(t);
      else s.add(t);
      return s;
    });
  }

  if (eventos.length === 0) {
    return (
      <EstadoVacio
        compacto
        titulo="Historial en blanco"
        texto="A medida que registres consultas, estudios, evaluaciones y reportes, aparecerán aquí en orden cronológico."
      />
    );
  }

  return (
    <div>
      {/* Filtros por tipo */}
      <div className="mb-5 flex flex-wrap gap-2">
        {TIPOS.map((t) => {
          const activo = !ocultos.has(t);
          return (
            <button
              key={t}
              onClick={() => alternar(t)}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all"
              style={{
                borderColor: activo ? COLOR_EVENTO[t] : "var(--borde)",
                backgroundColor: activo ? `${COLOR_EVENTO[t]}1e` : "transparent",
                color: activo ? COLOR_EVENTO[t] : "var(--texto-secundario)",
                opacity: activo ? 1 : 0.6,
              }}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: COLOR_EVENTO[t] }} />
              {ETIQUETA_EVENTO[t]}
              <span className="opacity-70">{conteo[t]}</span>
            </button>
          );
        })}
      </div>

      {/* Línea de tiempo */}
      <ol className="relative space-y-4 border-l border-[var(--borde)] pl-6">
        {visibles.map((e, i) => {
          const cuerpo = (
            <div className="rounded-suave border border-[var(--borde)] bg-[var(--superficie)] p-3.5 transition-all group-hover:border-rosa-hover group-hover:shadow-tarjeta">
              <div className="flex items-center justify-between gap-3">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                  style={{ backgroundColor: `${e.color}1e`, color: e.color }}
                >
                  {ETIQUETA_EVENTO[e.tipo]}
                </span>
                <span className="flex-none text-xs text-texto-secundario">{formatearFecha(e.fecha)}</span>
              </div>
              <p className="mt-1.5 font-medium text-texto-principal">{e.titulo}</p>
              {e.detalle && <p className="line-clamp-1 text-sm text-texto-secundario">{e.detalle}</p>}
            </div>
          );
          return (
            <motion.li
              key={e.clave}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
              className="group relative"
            >
              {/* Punto */}
              <span
                className="absolute -left-[31px] top-3 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--fondo)] text-white"
                style={{ background: e.color }}
              >
                <Icono nombre={e.icono} className="h-3.5 w-3.5" />
              </span>
              {e.href ? (
                <Link href={e.href} className="block">
                  {cuerpo}
                </Link>
              ) : (
                cuerpo
              )}
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
