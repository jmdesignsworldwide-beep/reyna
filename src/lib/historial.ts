import type { Consulta, Estudio, TipoReporte } from "@/types/database";
import { ETIQUETA_TIPO_CONSULTA } from "@/lib/consultas";
import { ETIQUETA_TIPO_ESTUDIO } from "@/lib/cardio";
import { ETIQUETA_TIPO_REPORTE } from "@/lib/reportes";
import { ETIQUETA_ESTADO_EVALUACION, riesgoCV } from "@/lib/evaluaciones";
import type { RiesgoCV } from "@/types/database";

export type TipoEvento = "consulta" | "estudio" | "evaluacion" | "reporte";

export interface EventoHistorial {
  clave: string;
  tipo: TipoEvento;
  fecha: string; // YYYY-MM-DD
  titulo: string;
  detalle: string | null;
  href: string | null;
  color: string;
  icono: string;
}

export const ETIQUETA_EVENTO: Record<TipoEvento, string> = {
  consulta: "Consulta",
  estudio: "Estudio",
  evaluacion: "Evaluación",
  reporte: "Reporte",
};

export const COLOR_EVENTO: Record<TipoEvento, string> = {
  consulta: "#B14A73",
  estudio: "#6C8CD5",
  evaluacion: "#4CAF82",
  reporte: "#E8A13C",
};

interface EntradaHistorial {
  pacienteId: string;
  consultas: Pick<Consulta, "id" | "fecha" | "tipo" | "diagnosticos" | "motivo">[];
  estudios: Pick<Estudio, "id" | "fecha_estudio" | "tipo" | "conclusion">[];
  evaluaciones: { id: string; fecha: string; estado: "borrador" | "firmada"; riesgo_cv: RiesgoCV | null }[];
  reportes: { id: string; fecha: string; tipo: TipoReporte; titulo: string }[];
}

/**
 * Construye la línea de tiempo clínica unificada del paciente: mezcla
 * consultas, estudios, evaluaciones y reportes, ordenados de más reciente a
 * más antiguo. Los pagos NO entran aquí (viven en su propia sección).
 */
export function construirHistorial(e: EntradaHistorial): EventoHistorial[] {
  const eventos: EventoHistorial[] = [];

  for (const c of e.consultas) {
    eventos.push({
      clave: `c-${c.id}`,
      tipo: "consulta",
      fecha: c.fecha,
      titulo: ETIQUETA_TIPO_CONSULTA[c.tipo],
      detalle: c.diagnosticos?.[0]?.diagnostico ?? c.motivo ?? null,
      href: `/panel/pacientes/${e.pacienteId}/consultas/${c.id}`,
      color: COLOR_EVENTO.consulta,
      icono: "consultas",
    });
  }
  for (const s of e.estudios) {
    eventos.push({
      clave: `e-${s.id}`,
      tipo: "estudio",
      fecha: s.fecha_estudio,
      titulo: ETIQUETA_TIPO_ESTUDIO[s.tipo],
      detalle: s.conclusion ?? null,
      href: null,
      color: COLOR_EVENTO.estudio,
      icono: "estudios",
    });
  }
  for (const v of e.evaluaciones) {
    const r = riesgoCV(v.riesgo_cv);
    eventos.push({
      clave: `v-${v.id}`,
      tipo: "evaluacion",
      fecha: v.fecha,
      titulo: `Evaluación · ${ETIQUETA_ESTADO_EVALUACION[v.estado]}`,
      detalle: r ? `Riesgo ${r.texto.toLowerCase()}` : null,
      href: `/panel/pacientes/${e.pacienteId}/evaluaciones/${v.id}`,
      color: COLOR_EVENTO.evaluacion,
      icono: "evaluaciones",
    });
  }
  for (const r of e.reportes) {
    eventos.push({
      clave: `r-${r.id}`,
      tipo: "reporte",
      fecha: r.fecha,
      titulo: ETIQUETA_TIPO_REPORTE[r.tipo],
      detalle: r.titulo,
      href: `/panel/pacientes/${e.pacienteId}#reportes`,
      color: COLOR_EVENTO.reporte,
      icono: "reportes",
    });
  }

  // Más reciente primero; a igualdad de fecha, ordena por tipo estable.
  return eventos.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : a.clave < b.clave ? -1 : 1));
}
