import type { TipoConsulta, EstadoCita } from "@/types/database";

export const ETIQUETA_TIPO: Record<TipoConsulta, string> = {
  primera_vez: "Primera vez",
  seguimiento: "Seguimiento",
  ecocardiograma: "Ecocardiograma",
  electrocardiograma: "Electrocardiograma",
  chequeo_cardiovascular: "Chequeo cardiovascular",
};

export const TIPOS_CONSULTA: { valor: TipoConsulta; texto: string; duracion: number }[] = [
  { valor: "primera_vez", texto: "Primera vez", duracion: 45 },
  { valor: "seguimiento", texto: "Seguimiento", duracion: 30 },
  { valor: "ecocardiograma", texto: "Ecocardiograma", duracion: 45 },
  { valor: "electrocardiograma", texto: "Electrocardiograma", duracion: 20 },
  { valor: "chequeo_cardiovascular", texto: "Chequeo cardiovascular", duracion: 60 },
];

export const ESTADOS_CITA: EstadoCita[] = [
  "agendada",
  "confirmada",
  "atendida",
  "cancelada",
  "no_show",
];

export const ETIQUETA_ESTADO: Record<EstadoCita, string> = {
  agendada: "Agendada",
  confirmada: "Confirmada",
  atendida: "Atendida",
  cancelada: "Cancelada",
  no_show: "No asistió",
};

export const COLOR_ESTADO: Record<EstadoCita, string> = {
  agendada: "#8A6B78", // texto secundario
  confirmada: "#B14A73", // rosa principal
  atendida: "#4CAF82", // éxito
  cancelada: "#E0567A", // urgente
  no_show: "#E8A13C", // advertencia
};

export const DIAS_SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
export const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

/** "09:00:00" o "09:00" → "9:00 a. m." */
export function formatearHora(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  let h = Number(hStr);
  const m = mStr ?? "00";
  const mer = h >= 12 ? "p. m." : "a. m.";
  h = h % 12 || 12;
  return `${h}:${m} ${mer}`;
}

/** Fecha local en formato YYYY-MM-DD (sin desfase de zona horaria). */
export function claveFecha(d: Date): string {
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

/** Parsea "YYYY-MM-DD" a Date local (mediodía para evitar saltos de DST). */
export function fechaDesdeClave(clave: string): Date {
  const [a, m, d] = clave.split("-").map(Number);
  return new Date(a!, (m ?? 1) - 1, d ?? 1, 12, 0, 0);
}

/** Lunes de la semana que contiene a `d`. */
export function inicioSemana(d: Date): Date {
  const r = new Date(d);
  const dia = r.getDay(); // 0=domingo
  const diff = dia === 0 ? -6 : 1 - dia; // llevar a lunes
  r.setDate(r.getDate() + diff);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function diasDeSemana(d: Date): Date[] {
  const lunes = inicioSemana(d);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(lunes);
    x.setDate(lunes.getDate() + i);
    return x;
  });
}

/** Matriz de semanas (lunes→domingo) que cubre el mes de `d`. */
export function diasDeMes(d: Date): Date[][] {
  const primero = new Date(d.getFullYear(), d.getMonth(), 1);
  const inicio = inicioSemana(primero);
  const semanas: Date[][] = [];
  const cursor = new Date(inicio);
  for (let s = 0; s < 6; s++) {
    const semana: Date[] = [];
    for (let i = 0; i < 7; i++) {
      semana.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    semanas.push(semana);
    // Cortar si ya pasamos el mes y completamos una semana.
    if (cursor.getMonth() !== d.getMonth() && semanas.length >= 4 && semana[6]!.getMonth() !== d.getMonth()) {
      break;
    }
  }
  return semanas;
}

export function mismoDia(a: Date, b: Date): boolean {
  return claveFecha(a) === claveFecha(b);
}

export function esHoy(d: Date): boolean {
  return mismoDia(d, new Date());
}

/** Suma minutos a "HH:MM" y devuelve "HH:MM". */
export function sumarMinutos(hhmm: string, minutos: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = (h ?? 0) * 60 + (m ?? 0) + minutos;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function fechaLarga(d: Date): string {
  return `${DIAS_SEMANA[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}
