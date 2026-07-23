"use client";

import { TablaGlobal, type FilaGlobal } from "@/components/global/TablaGlobal";
import { LinkPrimario } from "@/components/ui/LinkPrimario";
import { BotonEliminar } from "@/components/global/BotonEliminar";
import { eliminarEvaluacion } from "@/app/panel/evaluaciones/acciones";
import { ETIQUETA_ESTADO_EVALUACION, riesgoCV } from "@/lib/evaluaciones";
import { formatearFecha } from "@/lib/formato";
import type { Evaluacion, RiesgoCV } from "@/types/database";

export interface FilaEvaluacion extends FilaGlobal {
  estado: Evaluacion["estado"];
  riesgo_cv: RiesgoCV | null;
}

export function EvaluacionesGlobal({
  filas,
  puedeBorrar,
}: {
  filas: FilaEvaluacion[];
  puedeBorrar: boolean;
}) {
  return (
    <TablaGlobal
      eyebrow="Documentos clínicos"
      titulo="Evaluaciones"
      filas={filas}
      sustantivo={["evaluación", "evaluaciones"]}
      vacioTitulo="Aún no hay evaluaciones"
      vacioTexto="Las evaluaciones cardiológicas formales se crean desde la ficha del paciente. Ve a un paciente para crear su primera evaluación y firmarla."
      vacioAccion={<LinkPrimario href="/panel/pacientes">Ir a un paciente →</LinkPrimario>}
      filtroTipo={{
        etiqueta: "Estado",
        opciones: [
          { valor: "borrador", texto: "Borrador" },
          { valor: "firmada", texto: "Firmada" },
        ],
      }}
      hrefDe={(f) => `/panel/pacientes/${f.pacienteId}/evaluaciones/${f.id}`}
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
          etiqueta: "Riesgo",
          render: (f) => {
            const r = riesgoCV((f as FilaEvaluacion).riesgo_cv);
            return r ? (
              <span
                className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={{ backgroundColor: `${r.color}1e`, color: r.color }}
              >
                {r.texto}
              </span>
            ) : (
              <span className="text-texto-secundario">—</span>
            );
          },
        },
        {
          etiqueta: "Estado",
          render: (f) => {
            const firmada = (f as FilaEvaluacion).estado === "firmada";
            return (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: firmada ? "rgba(76,175,130,0.14)" : "var(--superficie-suave)",
                  color: firmada ? "#4CAF82" : "var(--texto-secundario)",
                }}
              >
                {firmada && (
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
                {ETIQUETA_ESTADO_EVALUACION[(f as FilaEvaluacion).estado]}
              </span>
            );
          },
        },
      ]}
      accionesDe={
        puedeBorrar
          ? (f) =>
              (f as FilaEvaluacion).estado === "firmada" ? (
                <span className="text-xs text-texto-secundario">Inmutable</span>
              ) : (
                <BotonEliminar onEliminar={() => eliminarEvaluacion(f.id, f.pacienteId)} />
              )
          : undefined
      }
    />
  );
}
