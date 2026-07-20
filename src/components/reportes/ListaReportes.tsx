import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { HeartMark } from "@/components/ui/HeartMark";
import { AccionesReporte } from "@/components/reportes/AccionesReporte";
import { ETIQUETA_TIPO_REPORTE } from "@/lib/reportes";
import { formatearFechaHora } from "@/lib/formato";
import type { TipoReporte } from "@/types/database";

export interface ReporteVista {
  id: string;
  tipo: TipoReporte;
  titulo: string;
  fecha: string;
  created_at: string;
  pdf_url: string | null;
  resumen_texto: string | null;
  generadoPor: string | null;
}

const COLOR_TIPO: Record<TipoReporte, string> = {
  resumen_consulta: "#B14A73",
  resultado_estudio: "#6C8CD5",
  reporte_general: "#4CAF82",
};

export function ListaReportes({
  pacienteId,
  telefono,
  reportes,
  puedeCrear,
  puedeBorrar,
}: {
  pacienteId: string;
  telefono: string | null;
  reportes: ReporteVista[];
  puedeCrear: boolean;
  puedeBorrar: boolean;
}) {
  return (
    <Card>
      <div id="reportes" className="mb-4 flex flex-wrap items-center justify-between gap-3 scroll-mt-24">
        <div>
          <div className="flex items-center gap-2 text-sm text-rosa-medio">
            <HeartMark className="h-4 w-4" />
            <span>Documentos</span>
          </div>
          <h2 className="mt-1 font-display text-lg font-semibold text-texto-principal">
            Reportes médicos
          </h2>
          <p className="text-sm text-texto-secundario">
            {reportes.length} {reportes.length === 1 ? "reporte generado" : "reportes generados"}
          </p>
        </div>
        {puedeCrear && (
          <Link
            href={`/panel/pacientes/${pacienteId}/reportes/nueva`}
            className="rounded-suave bg-[linear-gradient(120deg,var(--rosa-principal),var(--rosa-medio))] px-4 py-2.5 text-sm font-medium text-white shadow-tarjeta transition-all hover:shadow-tarjeta-hover hover:brightness-105"
          >
            ＋ Generar reporte
          </Link>
        )}
      </div>

      {reportes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--tarjeta)]">
            <HeartMark className="h-7 w-7 animate-heart-pulse" />
          </span>
          <p className="max-w-sm text-sm text-texto-secundario">
            Aún no hay reportes para este paciente. Genera el primero —resumen de consulta, resultado
            de estudio o reporte general— y compártelo en PDF o por WhatsApp.
          </p>
          {puedeCrear && (
            <Link
              href={`/panel/pacientes/${pacienteId}/reportes/nueva`}
              className="mt-1 rounded-suave border border-[var(--borde)] px-4 py-2 text-sm font-medium text-rosa-principal transition-colors hover:border-rosa-hover"
            >
              Generar el primer reporte
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {reportes.map((r) => {
            const color = COLOR_TIPO[r.tipo];
            return (
              <li
                key={r.id}
                className="rounded-suave border border-[var(--borde)] p-4 transition-colors hover:border-rosa-hover"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span
                      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      style={{ backgroundColor: `${color}1e`, color }}
                    >
                      {ETIQUETA_TIPO_REPORTE[r.tipo]}
                    </span>
                    <p className="mt-1.5 font-medium text-texto-principal">{r.titulo}</p>
                    <p className="text-xs text-texto-secundario">
                      Generado el {formatearFechaHora(r.created_at)}
                      {r.generadoPor ? ` · por ${r.generadoPor}` : ""}
                    </p>
                  </div>
                  <AccionesReporte
                    reporteId={r.id}
                    pacienteId={pacienteId}
                    pdfUrl={r.pdf_url}
                    telefono={telefono}
                    resumen={r.resumen_texto}
                    puedeBorrar={puedeBorrar}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
