/**
 * Formato dominicano: fechas DD/MM/AAAA, hora 12h.
 */

export function formatearFecha(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const anio = d.getFullYear();
  return `${dia}/${mes}/${anio}`;
}

export function calcularEdad(fechaNacimiento: string | null): number | null {
  if (!fechaNacimiento) return null;
  const nac = new Date(fechaNacimiento);
  if (Number.isNaN(nac.getTime())) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad >= 0 ? edad : null;
}

export function formatearFechaHora(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  let horas = d.getHours();
  const minutos = String(d.getMinutes()).padStart(2, "0");
  const meridiano = horas >= 12 ? "p. m." : "a. m.";
  horas = horas % 12 || 12;
  return `${formatearFecha(d)} · ${horas}:${minutos} ${meridiano}`;
}
