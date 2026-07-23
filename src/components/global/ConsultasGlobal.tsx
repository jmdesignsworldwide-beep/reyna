"use client";

import { TablaGlobal, type FilaGlobal } from "@/components/global/TablaGlobal";
import { BotonEliminar } from "@/components/global/BotonEliminar";
import { eliminarConsulta } from "@/app/panel/consultas/acciones";
import { ETIQUETA_TIPO_CONSULTA, TIPOS_CONSULTA_CLINICA } from "@/lib/consultas";
import { formatearFecha } from "@/lib/formato";
import type { TipoConsultaClinica } from "@/types/database";

export interface FilaConsulta extends FilaGlobal {
  tipo: TipoConsultaClinica;
  diagnostico: string | null;
  registradoPor: string | null;
}

export function ConsultasGlobal({
  filas,
  puedeBorrar,
}: {
  filas: FilaConsulta[];
  puedeBorrar: boolean;
}) {
  return (
    <TablaGlobal
      eyebrow="Historia clínica"
      titulo="Consultas"
      filas={filas}
      sustantivo={["consulta", "consultas"]}
      vacioTexto="Aún no hay consultas registradas. Se crean desde la ficha de cada paciente."
      filtroTipo={{
        etiqueta: "Tipo",
        opciones: TIPOS_CONSULTA_CLINICA.map((t) => ({ valor: t.valor, texto: t.texto })),
      }}
      hrefDe={(f) => `/panel/pacientes/${f.pacienteId}/consultas/${f.id}`}
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
              {ETIQUETA_TIPO_CONSULTA[(f as FilaConsulta).tipo]}
            </span>
          ),
        },
        {
          etiqueta: "Diagnóstico",
          render: (f) => (
            <span className="line-clamp-1 text-texto-principal">{(f as FilaConsulta).diagnostico ?? "—"}</span>
          ),
        },
        {
          etiqueta: "Registró",
          render: (f) => (
            <span className="text-texto-secundario">{(f as FilaConsulta).registradoPor ?? "—"}</span>
          ),
        },
      ]}
      accionesDe={
        puedeBorrar
          ? (f) => <BotonEliminar onEliminar={() => eliminarConsulta(f.id, f.pacienteId)} />
          : undefined
      }
    />
  );
}
