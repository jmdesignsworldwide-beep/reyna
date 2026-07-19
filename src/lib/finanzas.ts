import type { MetodoPago, TipoPago, Pago, Gasto } from "@/types/database";

export const ETIQUETA_METODO: Record<MetodoPago, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
};

export const METODOS_PAGO: { valor: MetodoPago; texto: string }[] = [
  { valor: "efectivo", texto: "Efectivo" },
  { valor: "transferencia", texto: "Transferencia" },
  { valor: "tarjeta", texto: "Tarjeta" },
];

export const ETIQUETA_TIPO_PAGO: Record<TipoPago, string> = {
  consulta: "Consulta",
  ecocardiograma: "Ecocardiograma",
  electrocardiograma: "Electrocardiograma",
  chequeo: "Chequeo cardiovascular",
  otro: "Otro",
};

export const TIPOS_PAGO: { valor: TipoPago; texto: string }[] = [
  { valor: "consulta", texto: "Consulta" },
  { valor: "ecocardiograma", texto: "Ecocardiograma" },
  { valor: "electrocardiograma", texto: "Electrocardiograma" },
  { valor: "chequeo", texto: "Chequeo cardiovascular" },
  { valor: "otro", texto: "Otro" },
];

/** Formatea un monto en pesos dominicanos: RD$ 1,500.00 */
export function formatearRD(monto: number): string {
  const n = Number.isFinite(monto) ? monto : 0;
  return `RD$ ${n.toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Número de recibo con formato REC-000123. */
export function numeroRecibo(n: number): string {
  return `REC-${String(n).padStart(6, "0")}`;
}

/** Suma exacta en centavos (evita errores de coma flotante). */
export function sumar(montos: number[]): number {
  const centavos = montos.reduce((acc, m) => acc + Math.round(m * 100), 0);
  return centavos / 100;
}

export interface ResumenFinanciero {
  ingresos: number;
  egresos: number;
  balance: number;
  cantidadPagos: number;
  cantidadGastos: number;
}

export function resumen(pagos: Pick<Pago, "monto">[], gastos: Pick<Gasto, "monto">[]): ResumenFinanciero {
  const ingresos = sumar(pagos.map((p) => p.monto));
  const egresos = sumar(gastos.map((g) => g.monto));
  return {
    ingresos,
    egresos,
    balance: Math.round((ingresos - egresos) * 100) / 100,
    cantidadPagos: pagos.length,
    cantidadGastos: gastos.length,
  };
}

/** Margen de ganancia en % = (ingresos − egresos) / ingresos · 100. */
export function porcentajeMargen(ingresos: number, egresos: number): number {
  if (ingresos <= 0) return 0;
  return Math.round(((ingresos - egresos) / ingresos) * 1000) / 10;
}

/** Ticket promedio = total / cantidad (0 si no hay pagos). */
export function ticket(total: number, cantidad: number): number {
  if (cantidad <= 0) return 0;
  return Math.round((total / cantidad) * 100) / 100;
}

export type EstadoCrecimiento = "sube" | "baja" | "igual" | "nuevo" | "na";

export interface Crecimiento {
  pct: number;
  estado: EstadoCrecimiento;
}

/**
 * Comparativa contra el período anterior.
 *  - previo 0 y actual > 0 → "nuevo" (no hay base para un %).
 *  - ambos 0 → "na".
 */
export function crecimiento(actual: number, previo: number): Crecimiento {
  if (previo === 0) {
    if (actual === 0) return { pct: 0, estado: "na" };
    return { pct: 0, estado: "nuevo" };
  }
  const pct = Math.round(((actual - previo) / Math.abs(previo)) * 1000) / 10;
  if (pct === 0) return { pct: 0, estado: "igual" };
  return { pct: Math.abs(pct), estado: pct > 0 ? "sube" : "baja" };
}

const MESES_CORTOS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

/** Etiqueta corta de mes: "jul 26". mes0 en base 0 (0 = enero). */
export function nombreMesCorto(anio: number, mes0: number): string {
  return `${MESES_CORTOS[((mes0 % 12) + 12) % 12]} ${String(anio).slice(2)}`;
}

/** Clave AAAA-MM para agrupar por mes. */
export function claveMes(iso: string): string {
  return iso.slice(0, 7);
}

/**
 * Proyección lineal simple del cierre: acumulado / días transcurridos · días totales.
 * Devuelve el acumulado si aún no hay ritmo medible.
 */
export function proyeccionLineal(
  acumulado: number,
  diasTranscurridos: number,
  diasTotales: number,
): number {
  if (diasTranscurridos <= 0) return acumulado;
  const proy = (acumulado / diasTranscurridos) * diasTotales;
  return Math.round(proy * 100) / 100;
}

/** Agrupa montos por clave y devuelve total + porcentaje, orden descendente. */
export function agrupar<T>(
  items: T[],
  clave: (t: T) => string,
  monto: (t: T) => number,
): { clave: string; total: number; porcentaje: number }[] {
  const mapa = new Map<string, number>();
  for (const it of items) {
    const k = clave(it);
    mapa.set(k, Math.round(((mapa.get(k) ?? 0) + monto(it)) * 100) / 100);
  }
  const total = sumar([...mapa.values()]);
  return [...mapa.entries()]
    .map(([k, v]) => ({
      clave: k,
      total: v,
      porcentaje: total > 0 ? Math.round((v / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}
