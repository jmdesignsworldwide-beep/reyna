"use client";

import { TablaGlobal, type FilaGlobal } from "@/components/global/TablaGlobal";
import { BotonEliminar } from "@/components/global/BotonEliminar";
import { eliminarEstudio } from "@/app/panel/pacientes/acciones";
import { ETIQUETA_TIPO_ESTUDIO } from "@/lib/cardio";
import { formatearFecha } from "@/lib/formato";
import type { TipoEstudio } from "@/types/database";

export interface FilaEstudio extends FilaGlobal {
  tipo: TipoEstudio;
  conclusion: string | null;
  archivoUrl: string | null;
}

export function EstudiosGlobal({
  filas,
  puedeBorrar,
}: {
  filas: FilaEstudio[];
  puedeBorrar: boolean;
}) {
  return (
    <TablaGlobal
      eyebrow="Estudios cardiológicos"
      titulo="Estudios"
      filas={filas}
      sustantivo={["estudio", "estudios"]}
      vacioTexto="Aún no hay estudios registrados. Se cargan desde la ficha de cada paciente."
      filtroTipo={{
        etiqueta: "Tipo",
        opciones: Object.entries(ETIQUETA_TIPO_ESTUDIO).map(([valor, texto]) => ({ valor, texto })),
      }}
      hrefDe={(f) => `/panel/pacientes/${f.pacienteId}`}
      columnas={[
        {
          etiqueta: "Fecha",
          render: (f) => <span className="whitespace-nowrap text-texto-secundario">{formatearFecha(f.fecha)}</span>,
        },
        {
          etiqueta: "Paciente",
          principal: true,
          render: (f) => (
            <div className="min-w-0">
              <p className="truncate font-medium text-texto-principal">{f.pacienteNombre}</p>
              {f.cedula && <p className="text-xs text-texto-secundario">Cédula {f.cedula}</p>}
            </div>
          ),
        },
        {
          etiqueta: "Tipo",
          render: (f) => (
            <span className="inline-block rounded-full bg-[var(--superficie-suave)] px-2.5 py-0.5 text-xs text-texto-principal">
              {ETIQUETA_TIPO_ESTUDIO[(f as FilaEstudio).tipo]}
            </span>
          ),
        },
        {
          etiqueta: "Conclusión",
          render: (f) => (
            <span className="line-clamp-1 text-texto-principal">{(f as FilaEstudio).conclusion ?? "—"}</span>
          ),
        },
        {
          etiqueta: "Archivo",
          render: (f) => {
            const url = (f as FilaEstudio).archivoUrl;
            return url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-medium text-rosa-principal hover:text-rosa-hover"
              >
                Abrir ↗
              </a>
            ) : (
              <span className="text-xs text-texto-secundario">—</span>
            );
          },
        },
      ]}
      accionesDe={
        puedeBorrar
          ? (f) => <BotonEliminar onEliminar={() => eliminarEstudio(f.id, f.pacienteId)} />
          : undefined
      }
    />
  );
}
