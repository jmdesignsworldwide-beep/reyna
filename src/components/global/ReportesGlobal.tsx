"use client";

import { TablaGlobal, type FilaGlobal } from "@/components/global/TablaGlobal";
import { LinkPrimario } from "@/components/ui/LinkPrimario";
import { AccionesReporte } from "@/components/reportes/AccionesReporte";
import { ETIQUETA_TIPO_REPORTE } from "@/lib/reportes";
import { formatearFecha } from "@/lib/formato";
import type { TipoReporte } from "@/types/database";

export interface FilaReporte extends FilaGlobal {
  tipo: TipoReporte;
  titulo: string;
  telefono: string | null;
  pdfUrl: string | null;
  resumen: string | null;
}

const COLOR_TIPO: Record<TipoReporte, string> = {
  resumen_consulta: "#B14A73",
  resultado_estudio: "#6C8CD5",
  reporte_general: "#4CAF82",
};

export function ReportesGlobal({
  filas,
  puedeBorrar,
}: {
  filas: FilaReporte[];
  puedeBorrar: boolean;
}) {
  return (
    <TablaGlobal
      eyebrow="Documentos del paciente"
      titulo="Reportes"
      filas={filas}
      sustantivo={["reporte", "reportes"]}
      vacioTitulo="Aún no hay reportes"
      vacioTexto="Los reportes médicos (resumen de consulta, resultado de estudio, reporte general) se generan desde la ficha del paciente y se comparten en PDF o WhatsApp."
      vacioAccion={<LinkPrimario href="/panel/pacientes">Ir a Pacientes →</LinkPrimario>}
      filtroTipo={{
        etiqueta: "Tipo",
        opciones: Object.entries(ETIQUETA_TIPO_REPORTE).map(([valor, texto]) => ({ valor, texto })),
      }}
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
          render: (f) => {
            const t = (f as FilaReporte).tipo;
            return (
              <span
                className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={{ backgroundColor: `${COLOR_TIPO[t]}1e`, color: COLOR_TIPO[t] }}
              >
                {ETIQUETA_TIPO_REPORTE[t]}
              </span>
            );
          },
        },
        {
          etiqueta: "Título",
          render: (f) => <span className="line-clamp-1 text-texto-principal">{(f as FilaReporte).titulo}</span>,
        },
      ]}
      accionesDe={(f) => {
        const r = f as FilaReporte;
        return (
          <AccionesReporte
            reporteId={r.id}
            pacienteId={r.pacienteId}
            pdfUrl={r.pdfUrl}
            telefono={r.telefono}
            resumen={r.resumen}
            puedeBorrar={puedeBorrar}
          />
        );
      }}
    />
  );
}
