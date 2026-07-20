/**
 * Identidad de marca de la Dra. Reyna para documentos (PDF) y mensajes.
 * Centraliza el membrete para que todos los reportes se vean consistentes.
 *
 * EXEQUATUR / colegiatura: hoy no existe ese dato en el sistema. Se deja
 * configurable aquí y la línea se OMITE si está vacía — nunca se inventa un
 * número. Cuando la doctora dé su exequátur real, se pone aquí.
 */
export const MEDICO = {
  nombre: "Dra. Reyna Massiel",
  especialidad: "Cardiología · Medicina interna · Ecocardiografía",
  exequatur: "", // ej. "Exequátur 12345-67" — vacío = no se muestra
  marca: "JM Nexus Designs",
} as const;

/** Path SVG del corazón usado como logo del membrete (pdf-lib drawSvgPath). */
export const CORAZON =
  "M12 21s-9-5.4-9-12a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.6-9 12-9 12z";

/** Paleta de marca en componentes RGB 0..1 (para pdf-lib rgb()). */
export const MARCA_RGB = {
  rosa: [0.694, 0.29, 0.451] as [number, number, number], // #B14A73
  rosaClara: [0.984, 0.933, 0.953] as [number, number, number],
  texto: [0.353, 0.29, 0.322] as [number, number, number],
  secundario: [0.541, 0.42, 0.471] as [number, number, number],
  linea: [0.9, 0.83, 0.86] as [number, number, number],
} as const;
