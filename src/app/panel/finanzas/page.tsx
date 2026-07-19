import type { Metadata } from "next";
import { requerirRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PanelFinanzas } from "@/components/finanzas/PanelFinanzas";
import {
  resumen,
  agrupar,
  sumar,
  ticket,
  crecimiento,
  porcentajeMargen,
  proyeccionLineal,
  claveMes,
  nombreMesCorto,
  formatearRD,
  ETIQUETA_TIPO_PAGO,
  ETIQUETA_METODO,
} from "@/lib/finanzas";
import { formatearFecha } from "@/lib/formato";
import type { Pago, Gasto, CategoriaGasto } from "@/types/database";

export const metadata: Metadata = { title: "Finanzas" };

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function clave(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function sumarDias(iso: string, dias: number) {
  const [a, m, d] = iso.split("-").map(Number);
  const fecha = new Date(a!, (m ?? 1) - 1, d ?? 1);
  fecha.setDate(fecha.getDate() + dias);
  return clave(fecha);
}
function diasEntre(desde: string, hasta: string) {
  const [a1, m1, d1] = desde.split("-").map(Number);
  const [a2, m2, d2] = hasta.split("-").map(Number);
  const t1 = new Date(a1!, (m1 ?? 1) - 1, d1 ?? 1).getTime();
  const t2 = new Date(a2!, (m2 ?? 1) - 1, d2 ?? 1).getTime();
  return Math.round((t2 - t1) / 86400000) + 1;
}

type PagoRango = Pick<Pago, "monto" | "tipo" | "metodo_pago" | "fecha" | "paciente_id" | "cita_id">;
type GastoRango = Pick<Gasto, "monto" | "categoria_id" | "fecha" | "nota">;

export default async function FinanzasPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  await requerirRol("admin");
  const sp = await searchParams;

  const hoy = new Date();
  const inicioMes = clave(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const desde = FECHA.test(sp.desde ?? "") ? sp.desde! : inicioMes;
  const hasta = FECHA.test(sp.hasta ?? "") ? sp.hasta! : clave(hoy);

  // Período anterior comparable (misma cantidad de días, justo antes).
  const largo = Math.max(diasEntre(desde, hasta), 1);
  const prevHasta = sumarDias(desde, -1);
  const prevDesde = sumarDias(prevHasta, -(largo - 1));

  // Ventana de 12 meses para la evolución (incluye el mes actual).
  const inicioSerie = clave(new Date(hoy.getFullYear(), hoy.getMonth() - 11, 1));

  const supabase = await createClient();
  const [
    { data: pagosRaw },
    { data: gastosRaw },
    { data: catsRaw },
    { data: sedesRaw },
    { data: pagosPrevRaw },
    { data: gastosPrevRaw },
    { data: pagosSerieRaw },
    { data: gastosSerieRaw },
  ] = await Promise.all([
    supabase
      .from("pagos")
      .select("monto, tipo, metodo_pago, fecha, paciente_id, cita_id")
      .gte("fecha", desde)
      .lte("fecha", hasta),
    supabase
      .from("gastos")
      .select("monto, categoria_id, fecha, nota")
      .gte("fecha", desde)
      .lte("fecha", hasta),
    supabase.from("categorias_gasto").select("id, nombre"),
    supabase.from("sedes").select("id, nombre"),
    supabase.from("pagos").select("monto, paciente_id").gte("fecha", prevDesde).lte("fecha", prevHasta),
    supabase.from("gastos").select("monto").gte("fecha", prevDesde).lte("fecha", prevHasta),
    supabase.from("pagos").select("monto, fecha").gte("fecha", inicioSerie).lte("fecha", clave(hoy)),
    supabase.from("gastos").select("monto, fecha").gte("fecha", inicioSerie).lte("fecha", clave(hoy)),
  ]);

  const pagos = (pagosRaw as PagoRango[] | null) ?? [];
  const gastos = (gastosRaw as GastoRango[] | null) ?? [];
  const cats = new Map(
    ((catsRaw as Pick<CategoriaGasto, "id" | "nombre">[] | null) ?? []).map((c) => [c.id, c.nombre]),
  );
  const sedes = new Map(
    ((sedesRaw as { id: string; nombre: string }[] | null) ?? []).map((s) => [s.id, s.nombre]),
  );
  const pagosPrev = (pagosPrevRaw as Pick<Pago, "monto" | "paciente_id">[] | null) ?? [];
  const gastosPrev = (gastosPrevRaw as Pick<Gasto, "monto">[] | null) ?? [];
  const pagosSerie = (pagosSerieRaw as Pick<Pago, "monto" | "fecha">[] | null) ?? [];
  const gastosSerie = (gastosSerieRaw as Pick<Gasto, "monto" | "fecha">[] | null) ?? [];

  // Mapa cita → sede (para ingresos por sede; los pagos sin cita van a "Sin sede asignada").
  const citaIds = [...new Set(pagos.map((p) => p.cita_id).filter(Boolean))] as string[];
  const citaSede = new Map<string, string>();
  if (citaIds.length > 0) {
    const { data: citasRaw } = await supabase
      .from("citas")
      .select("id, sede_id")
      .in("id", citaIds);
    for (const c of (citasRaw as { id: string; sede_id: string | null }[] | null) ?? []) {
      if (c.sede_id) citaSede.set(c.id, c.sede_id);
    }
  }

  // ---------- KPIs ----------
  const actual = resumen(pagos, gastos);
  const prev = resumen(pagosPrev, gastosPrev);
  const margen = porcentajeMargen(actual.ingresos, actual.egresos);
  const margenPrev = porcentajeMargen(prev.ingresos, prev.egresos);
  const ticketProm = ticket(actual.ingresos, actual.cantidadPagos);
  const pacientes = new Set(pagos.map((p) => p.paciente_id).filter(Boolean)).size;
  const pacientesPrev = new Set(pagosPrev.map((p) => p.paciente_id).filter(Boolean)).size;

  const kpi = {
    ingresos: actual.ingresos,
    egresos: actual.egresos,
    balance: actual.balance,
    margen,
    ticket: ticketProm,
    cantidadPagos: actual.cantidadPagos,
    cantidadGastos: actual.cantidadGastos,
    pacientes,
  };
  const crec = {
    ingresos: crecimiento(actual.ingresos, prev.ingresos),
    egresos: crecimiento(actual.egresos, prev.egresos),
    balance: crecimiento(actual.balance, prev.balance),
    margen: crecimiento(margen, margenPrev),
    pacientes: crecimiento(pacientes, pacientesPrev),
  };

  // ---------- Desgloses ----------
  const porTipo = agrupar(pagos, (p) => ETIQUETA_TIPO_PAGO[p.tipo], (p) => p.monto);
  const porMetodo = agrupar(pagos, (p) => ETIQUETA_METODO[p.metodo_pago], (p) => p.monto);
  const porSede = agrupar(
    pagos,
    (p) => (p.cita_id && citaSede.get(p.cita_id) ? sedes.get(citaSede.get(p.cita_id)!) ?? "Otra sede" : "Sin sede asignada"),
    (p) => p.monto,
  );
  const porCategoria = agrupar(
    gastos,
    (g) => cats.get(g.categoria_id ?? "") ?? "Sin categoría",
    (g) => g.monto,
  );

  // ---------- Evolución mensual (12 meses) ----------
  const ingXMes = new Map<string, number[]>();
  const gasXMes = new Map<string, number[]>();
  for (const p of pagosSerie) {
    const k = claveMes(p.fecha);
    ingXMes.set(k, [...(ingXMes.get(k) ?? []), p.monto]);
  }
  for (const g of gastosSerie) {
    const k = claveMes(g.fecha);
    gasXMes.set(k, [...(gasXMes.get(k) ?? []), g.monto]);
  }
  const serieMensual: { etiqueta: string; ingresos: number; egresos: number; margen: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const ing = sumar(ingXMes.get(k) ?? []);
    const gas = sumar(gasXMes.get(k) ?? []);
    serieMensual.push({
      etiqueta: nombreMesCorto(d.getFullYear(), d.getMonth()),
      ingresos: ing,
      egresos: gas,
      margen: porcentajeMargen(ing, gas),
    });
  }
  const haySerie = pagosSerie.length > 0 || gastosSerie.length > 0;

  // ---------- Mejor / peor día del rango ----------
  const ingXDia = new Map<string, number[]>();
  for (const p of pagos) ingXDia.set(p.fecha, [...(ingXDia.get(p.fecha) ?? []), p.monto]);
  const dias = [...ingXDia.entries()]
    .map(([fecha, montos]) => ({ fecha, total: sumar(montos) }))
    .sort((a, b) => b.total - a.total);
  const mejorDia = dias[0] ?? null;
  const peorDia = dias.length > 1 ? dias[dias.length - 1] ?? null : null;

  // ---------- Mayor gasto individual ----------
  const mayorGasto = [...gastos].sort((a, b) => b.monto - a.monto)[0] ?? null;

  // ---------- Proyección de cierre de mes (solo si el rango es el mes en curso) ----------
  const esMesActual = desde === inicioMes && hasta === clave(hoy);
  const diasDelMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  const proyeccion = esMesActual
    ? {
        ingresos: proyeccionLineal(actual.ingresos, hoy.getDate(), diasDelMes),
        egresos: proyeccionLineal(actual.egresos, hoy.getDate(), diasDelMes),
        diaActual: hoy.getDate(),
        diasDelMes,
      }
    : null;

  // ---------- Resumen ejecutivo "en cristiano" ----------
  const frases: string[] = [];
  if (actual.cantidadPagos > 0 || actual.cantidadGastos > 0) {
    frases.push(
      `Ingresaste ${formatearRD(actual.ingresos)} y gastaste ${formatearRD(actual.egresos)}, ` +
        `dejando un balance de ${formatearRD(actual.balance)}` +
        (actual.ingresos > 0 ? ` (margen ${margen}%).` : "."),
    );
  }
  if (pacientes > 0 && ticketProm > 0) {
    frases.push(`Atendiste ${pacientes} ${pacientes === 1 ? "paciente" : "pacientes"} con un ticket promedio de ${formatearRD(ticketProm)}.`);
  }
  if (mejorDia) {
    frases.push(`Tu mejor día fue el ${formatearFecha(mejorDia.fecha)} con ${formatearRD(mejorDia.total)} en ingresos.`);
  }
  if (crec.ingresos.estado === "sube") {
    frases.push(`Tus ingresos subieron ${crec.ingresos.pct}% frente al período anterior.`);
  } else if (crec.ingresos.estado === "baja") {
    frases.push(`Tus ingresos bajaron ${crec.ingresos.pct}% frente al período anterior.`);
  }

  // ---------- Alertas inteligentes (solo con datos reales) ----------
  type Alerta = { tono: "bien" | "aviso" | "peligro" | "info"; texto: string };
  const alertas: Alerta[] = [];
  if (actual.balance < 0) {
    alertas.push({ tono: "peligro", texto: `Estás en rojo: gastaste ${formatearRD(actual.egresos - actual.ingresos)} más de lo que ingresó.` });
  }
  if (crec.egresos.estado === "sube" && crec.egresos.pct >= 15) {
    alertas.push({ tono: "aviso", texto: `Tus gastos subieron ${crec.egresos.pct}% frente al período anterior.` });
  }
  if (crec.ingresos.estado === "baja" && crec.ingresos.pct >= 15) {
    alertas.push({ tono: "aviso", texto: `Tus ingresos bajaron ${crec.ingresos.pct}% frente al período anterior.` });
  }
  if (crec.ingresos.estado === "sube" && crec.ingresos.pct >= 10) {
    alertas.push({ tono: "bien", texto: `Buen ritmo: tus ingresos crecieron ${crec.ingresos.pct}%.` });
  }
  if (porTipo.length > 0 && porTipo[0]!.total > 0) {
    alertas.push({ tono: "info", texto: `Tu servicio más rentable es ${porTipo[0]!.clave} (${formatearRD(porTipo[0]!.total)}, ${porTipo[0]!.porcentaje}% del ingreso).` });
  }
  if (actual.balance >= 0 && actual.ingresos > 0 && margen > 0 && margen < 20) {
    alertas.push({ tono: "aviso", texto: `Tu margen es ajustado (${margen}%). Revisa los gastos si quieres más holgura.` });
  }

  const mayorGastoInfo = mayorGasto
    ? {
        monto: mayorGasto.monto,
        categoria: cats.get(mayorGasto.categoria_id ?? "") ?? mayorGasto.nota?.trim() ?? "Sin categoría",
        fecha: mayorGasto.fecha,
      }
    : null;

  return (
    <PanelFinanzas
      desde={desde}
      hasta={hasta}
      kpi={kpi}
      crec={crec}
      resumenEjecutivo={frases}
      porTipo={porTipo}
      porSede={porSede}
      porMetodo={porMetodo}
      porCategoria={porCategoria}
      serieMensual={serieMensual}
      haySerie={haySerie}
      proyeccion={proyeccion}
      analisis={{
        mejorDia,
        peorDia,
        mayorGasto: mayorGastoInfo,
      }}
      alertas={alertas.slice(0, 4)}
    />
  );
}
