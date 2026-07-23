/** Utilidades puras de filtrado para las vistas globales. */

/** ¿La fecha (YYYY-MM-DD) cae dentro del rango? Extremos vacíos = sin límite. */
export function enRango(fecha: string, desde: string, hasta: string): boolean {
  if (desde && fecha < desde) return false;
  if (hasta && fecha > hasta) return false;
  return true;
}

/** Normaliza texto para búsqueda: minúsculas y sin acentos. */
export function normaliza(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}
