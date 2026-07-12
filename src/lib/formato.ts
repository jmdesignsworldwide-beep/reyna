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

export function formatearFechaHora(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  let horas = d.getHours();
  const minutos = String(d.getMinutes()).padStart(2, "0");
  const meridiano = horas >= 12 ? "p. m." : "a. m.";
  horas = horas % 12 || 12;
  return `${formatearFecha(d)} · ${horas}:${minutos} ${meridiano}`;
}
