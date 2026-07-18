"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { HeartMark } from "@/components/ui/HeartMark";
import { EvolucionGraficas } from "@/components/consultas/EvolucionGraficas";
import {
  ETIQUETA_TIPO_CONSULTA,
  resumenVitales,
  serieEvolucion,
} from "@/lib/consultas";
import { formatearFecha } from "@/lib/formato";
import type { Consulta } from "@/types/database";

export function LineaTiempo({
  pacienteId,
  consultas,
  puedeCrear,
}: {
  pacienteId: string;
  consultas: Consulta[];
  puedeCrear: boolean;
}) {
  const ordenadas = [...consultas].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const serie = serieEvolucion(consultas);
  const hayGrafico = serie.length >= 2;

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-rosa-medio">
            <HeartMark className="h-4 w-4" />
            <span>Historia clínica</span>
          </div>
          <h2 className="mt-1 font-display text-lg font-semibold text-texto-principal">
            Evolución del paciente
          </h2>
          <p className="text-sm text-texto-secundario">
            {consultas.length}{" "}
            {consultas.length === 1 ? "consulta registrada" : "consultas registradas"}
          </p>
        </div>
        {puedeCrear && (
          <Link
            href={`/panel/pacientes/${pacienteId}/consultas/nueva`}
            className="rounded-suave bg-[linear-gradient(120deg,var(--rosa-principal),var(--rosa-medio))] px-4 py-2.5 text-sm font-medium text-white shadow-tarjeta transition-all hover:shadow-tarjeta-hover hover:brightness-105"
          >
            ＋ Nueva consulta
          </Link>
        )}
      </div>

      {/* Mini-gráficos de evolución */}
      {hayGrafico && (
        <div className="mb-6">
          <EvolucionGraficas serie={serie} />
        </div>
      )}

      {ordenadas.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <HeartMark className="h-8 w-8 opacity-70" />
          <p className="text-sm text-texto-secundario">
            Aún no hay consultas registradas para este paciente.
          </p>
          {puedeCrear && (
            <Link
              href={`/panel/pacientes/${pacienteId}/consultas/nueva`}
              className="text-sm text-rosa-principal hover:text-rosa-hover"
            >
              Registrar la primera consulta →
            </Link>
          )}
        </div>
      ) : (
        <ol className="relative space-y-4 before:absolute before:left-[9px] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-[var(--borde)]">
          {ordenadas.map((c, i) => {
            const vitales = resumenVitales(c);
            return (
              <motion.li
                key={c.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.4), duration: 0.3 }}
                className="relative pl-8"
              >
                <span className="absolute left-0 top-1.5 flex h-[19px] w-[19px] items-center justify-center rounded-full border-2 border-[var(--fondo)] bg-[linear-gradient(120deg,var(--rosa-principal),var(--rosa-medio))]">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                </span>

                <Link
                  href={`/panel/pacientes/${pacienteId}/consultas/${c.id}`}
                  className="block rounded-suave border border-[var(--borde)] p-4 transition-all hover:-translate-y-0.5 hover:border-rosa-hover hover:shadow-tarjeta"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-texto-principal">
                      {formatearFecha(c.fecha)}
                    </p>
                    <span className="rounded-full bg-rosa-pastel/60 px-2.5 py-0.5 text-xs font-medium text-rosa-principal">
                      {ETIQUETA_TIPO_CONSULTA[c.tipo]}
                    </span>
                  </div>

                  {c.motivo && (
                    <p className="mt-1 line-clamp-1 text-sm text-texto-secundario">
                      {c.motivo}
                    </p>
                  )}

                  {vitales.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {vitales.map((v) => (
                        <span
                          key={v}
                          className="rounded-md bg-[var(--superficie-suave)] px-2 py-0.5 text-xs text-texto-secundario"
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  )}

                  {c.diagnosticos.length > 0 && (
                    <p className="mt-2 line-clamp-1 text-sm text-texto-principal">
                      <span className="text-texto-secundario">Dx: </span>
                      {c.diagnosticos.map((d) => d.diagnostico).join(", ")}
                    </p>
                  )}

                  <span className="mt-2 inline-block text-sm text-rosa-principal">
                    Ver detalle →
                  </span>
                </Link>
              </motion.li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
