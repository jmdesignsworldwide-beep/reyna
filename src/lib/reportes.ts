import type { TipoReporte, Consulta, Estudio, Paciente } from "@/types/database";
import { MEDICO } from "@/lib/membrete";
import { ETIQUETA_TIPO_ESTUDIO, factoresDeRiesgo, nivelRiesgo } from "@/lib/cardio";
import { ETIQUETA_TIPO_CONSULTA } from "@/lib/consultas";
import { formatearFecha } from "@/lib/formato";

export const ETIQUETA_TIPO_REPORTE: Record<TipoReporte, string> = {
  resumen_consulta: "Resumen de consulta",
  resultado_estudio: "Resultado de estudio",
  reporte_general: "Reporte general del paciente",
};

export const DESCRIPCION_TIPO_REPORTE: Record<TipoReporte, string> = {
  resumen_consulta:
    "Lo que pasó en una visita: signos vitales, diagnóstico, plan e indicaciones.",
  resultado_estudio:
    "Un estudio (eco, ECG, Holter…) con sus hallazgos y conclusión, para el paciente.",
  reporte_general:
    "Resumen del historial: datos, factores de riesgo, últimas consultas y evolución.",
};

// ---------- Snapshot del reporte (se guarda en contenido jsonb) ----------
export interface PacienteSnap {
  nombre: string;
  cedula: string | null;
  edad: number | null;
  sexo: string | null;
}
export interface ConsultaSnap {
  fecha: string; // DD/MM/AAAA
  tipo: string;
  motivo: string | null;
  vitales: string[]; // ["TA 120/80 mmHg", "FC 72 lpm", ...]
  diagnosticos: string[];
  plan: string | null;
  prescripcion: string[];
  proxima_reevaluacion: string | null;
  indicaciones: string | null;
}
export interface EstudioSnap {
  tipo: string;
  fecha: string; // DD/MM/AAAA
  hallazgos: string | null;
  conclusion: string | null;
  realizado_por: string | null;
}
export interface GeneralSnap {
  riesgo: string;
  factores: string[];
  medicacion: string[];
  alergias: string | null;
  ultimasConsultas: { fecha: string; resumen: string }[];
}
export interface ContenidoReporte {
  paciente: PacienteSnap;
  consulta?: ConsultaSnap;
  estudio?: EstudioSnap;
  general?: GeneralSnap;
}

// ---------- Constructores de snapshot (puros, compartidos server + cliente) ----------

export function snapConsulta(co: Consulta): ConsultaSnap {
  const vitales: string[] = [];
  if (co.ta_sistolica !== null && co.ta_diastolica !== null)
    vitales.push(`TA ${co.ta_sistolica}/${co.ta_diastolica} mmHg`);
  if (co.frecuencia_cardiaca !== null) vitales.push(`FC ${co.frecuencia_cardiaca} lpm`);
  if (co.frecuencia_respiratoria !== null) vitales.push(`FR ${co.frecuencia_respiratoria} rpm`);
  if (co.spo2 !== null) vitales.push(`SpO2 ${co.spo2}%`);
  if (co.temperatura !== null) vitales.push(`Temp ${co.temperatura} °C`);
  if (co.peso !== null) vitales.push(`Peso ${co.peso} kg`);
  if (co.talla !== null) vitales.push(`Talla ${co.talla} cm`);
  if (co.imc !== null) vitales.push(`IMC ${co.imc}`);
  return {
    fecha: formatearFecha(co.fecha),
    tipo: ETIQUETA_TIPO_CONSULTA[co.tipo],
    motivo: co.motivo,
    vitales,
    diagnosticos: co.diagnosticos.map((d) => (d.cie10 ? `${d.diagnostico} (${d.cie10})` : d.diagnostico)),
    plan: co.plan_conducta,
    prescripcion: co.prescripcion.map((r) =>
      [r.medicamento, r.dosis, r.frecuencia, r.duracion].filter(Boolean).join(" · "),
    ),
    proxima_reevaluacion: co.proxima_reevaluacion,
    indicaciones: co.notas_evolucion,
  };
}

export function snapEstudio(e: Estudio): EstudioSnap {
  return {
    tipo: ETIQUETA_TIPO_ESTUDIO[e.tipo],
    fecha: formatearFecha(e.fecha_estudio),
    hallazgos: e.hallazgos,
    conclusion: e.conclusion,
    realizado_por: e.realizado_por,
  };
}

export function snapGeneral(
  p: Paciente,
  ultimas: Pick<Consulta, "fecha" | "motivo" | "diagnosticos">[],
): GeneralSnap {
  const fr = factoresDeRiesgo(p);
  const riesgo = nivelRiesgo(fr.length);
  return {
    riesgo: `${riesgo.etiqueta} · ${fr.length} ${fr.length === 1 ? "factor" : "factores"}`,
    factores: fr.map((f) => (f.detalle ? `${f.etiqueta} (${f.detalle})` : f.etiqueta)),
    medicacion: p.medicacion.map((m) => [m.medicamento, m.dosis, m.frecuencia].filter(Boolean).join(" · ")),
    alergias: (p.alergias ?? "").trim() || null,
    ultimasConsultas: ultimas.map((u) => ({
      fecha: formatearFecha(u.fecha),
      resumen:
        u.diagnosticos.map((d) => d.diagnostico).filter(Boolean).join("; ") || u.motivo || "Consulta",
    })),
  };
}

// ---------- Teléfono / WhatsApp ----------

/**
 * Normaliza un teléfono dominicano a formato wa.me (código país RD = 1).
 * Acepta 10 dígitos (809/829/849 + 7) → antepone "1"; o 11 con "1" delante.
 * Devuelve null si no es un número reconocible (para deshabilitar el botón).
 */
export function normalizarTelefonoRD(tel: string | null | undefined): string | null {
  if (!tel) return null;
  const d = tel.replace(/\D/g, "");
  if (d.length === 10) return `1${d}`;
  if (d.length === 11 && d.startsWith("1")) return d;
  return null;
}

/** Construye el enlace wa.me con el mensaje pre-escrito, o null si no hay número válido. */
export function enlaceWhatsApp(
  tel: string | null | undefined,
  mensaje: string,
): string | null {
  const num = normalizarTelefonoRD(tel);
  if (!num) return null;
  return `https://wa.me/${num}?text=${encodeURIComponent(mensaje)}`;
}

/**
 * Mensaje profesional y cálido, listo para WhatsApp, según el tipo de reporte.
 * Se guarda en reportes.resumen_texto para reenviarlo de forma consistente.
 */
export function construirMensaje(
  tipo: TipoReporte,
  contenido: ContenidoReporte,
  fechaTexto: string,
): string {
  const primer = contenido.paciente.nombre.split(" ")[0] || contenido.paciente.nombre;
  const saludo = `Estimado/a ${primer}, le saluda el consultorio de la ${MEDICO.nombre}.`;
  const cierre = "Cualquier duda quedamos a la orden. Cuídese mucho.";
  const lineas: string[] = [saludo, ""];

  if (tipo === "resumen_consulta" && contenido.consulta) {
    const c = contenido.consulta;
    lineas.push(`Aquí el resumen de su consulta del ${c.fecha}:`);
    if (c.vitales.length) lineas.push(`• Signos vitales: ${c.vitales.join(", ")}.`);
    if (c.diagnosticos.length) lineas.push(`• Diagnóstico: ${c.diagnosticos.join("; ")}.`);
    if (c.plan) lineas.push(`• Plan: ${c.plan}`);
    if (c.indicaciones) lineas.push(`• Indicaciones: ${c.indicaciones}`);
    if (c.proxima_reevaluacion) lineas.push(`• Próxima reevaluación: ${c.proxima_reevaluacion}.`);
  } else if (tipo === "resultado_estudio" && contenido.estudio) {
    const e = contenido.estudio;
    lineas.push(`Aquí el resultado de su ${e.tipo} del ${e.fecha}:`);
    if (e.hallazgos) lineas.push(`• Hallazgos: ${e.hallazgos}`);
    if (e.conclusion) lineas.push(`• Conclusión: ${e.conclusion}`);
  } else if (tipo === "reporte_general" && contenido.general) {
    const g = contenido.general;
    lineas.push(`Aquí un resumen de su estado de salud cardiovascular al ${fechaTexto}:`);
    if (g.riesgo) lineas.push(`• Riesgo cardiovascular: ${g.riesgo}.`);
    if (g.factores.length) lineas.push(`• Factores de riesgo: ${g.factores.join(", ")}.`);
    if (g.medicacion.length) lineas.push(`• Medicación: ${g.medicacion.join("; ")}.`);
  }

  lineas.push("", "Adjunto encontrará el documento en PDF con el detalle.", "", cierre);
  return lineas.join("\n");
}
