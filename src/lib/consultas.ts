import type { Consulta, TipoConsultaClinica } from "@/types/database";

export const ETIQUETA_TIPO_CONSULTA: Record<TipoConsultaClinica, string> = {
  primera_vez: "Primera vez",
  seguimiento: "Seguimiento",
  control: "Control",
  post_estudio: "Post-estudio",
};

export const TIPOS_CONSULTA_CLINICA: {
  valor: TipoConsultaClinica;
  texto: string;
}[] = [
  { valor: "primera_vez", texto: "Primera vez" },
  { valor: "seguimiento", texto: "Seguimiento" },
  { valor: "control", texto: "Control" },
  { valor: "post_estudio", texto: "Post-estudio" },
];

/**
 * Clasificación visual (no diagnóstica) de la presión arterial según guías
 * (ACC/AHA). Devuelve etiqueta y color de marca para pintar el signo vital.
 */
export function clasificacionTA(
  sis: number | null,
  dia: number | null,
): { etiqueta: string; color: string } | null {
  if (sis === null && dia === null) return null;
  const s = sis ?? 0;
  const d = dia ?? 0;
  if (s >= 180 || d >= 120)
    return { etiqueta: "Crisis hipertensiva", color: "#E0567A" };
  if (s >= 140 || d >= 90)
    return { etiqueta: "Hipertensión grado 2", color: "#E0567A" };
  if (s >= 130 || d >= 80)
    return { etiqueta: "Hipertensión grado 1", color: "#E8A13C" };
  if (s >= 120 && d < 80) return { etiqueta: "Elevada", color: "#E8A13C" };
  if (s > 0 && d > 0 && s < 90 && d < 60)
    return { etiqueta: "Hipotensión", color: "#E8A13C" };
  return { etiqueta: "Normal", color: "#4CAF82" };
}

/** Color simple para la frecuencia cardíaca (visual, no diagnóstico). */
export function colorFC(fc: number | null): string {
  if (fc === null) return "var(--texto-secundario)";
  if (fc < 60 || fc > 100) return "#E8A13C";
  return "#4CAF82";
}

/** SpO2: verde ≥95, ámbar 90–94, rojo <90. */
export function colorSpo2(spo2: number | null): string {
  if (spo2 === null) return "var(--texto-secundario)";
  if (spo2 < 90) return "#E0567A";
  if (spo2 < 95) return "#E8A13C";
  return "#4CAF82";
}

export interface PuntoEvolucion {
  fecha: string; // YYYY-MM-DD
  sistolica: number | null;
  diastolica: number | null;
  fc: number | null;
}

/**
 * Serie temporal (antigua → reciente) de TA y FC para los mini-gráficos.
 * Recibe las consultas en cualquier orden y las ordena por fecha ascendente.
 */
export function serieEvolucion(consultas: Consulta[]): PuntoEvolucion[] {
  return [...consultas]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((c) => ({
      fecha: c.fecha,
      sistolica: c.ta_sistolica,
      diastolica: c.ta_diastolica,
      fc: c.frecuencia_cardiaca,
    }));
}

/** Resumen corto de signos vitales para la línea de tiempo. */
export function resumenVitales(c: Consulta): string[] {
  const out: string[] = [];
  if (c.ta_sistolica !== null && c.ta_diastolica !== null)
    out.push(`TA ${c.ta_sistolica}/${c.ta_diastolica}`);
  if (c.frecuencia_cardiaca !== null) out.push(`FC ${c.frecuencia_cardiaca}`);
  if (c.spo2 !== null) out.push(`SpO₂ ${c.spo2}%`);
  if (c.peso !== null) out.push(`${c.peso} kg`);
  if (c.imc !== null) out.push(`IMC ${c.imc}`);
  return out;
}
