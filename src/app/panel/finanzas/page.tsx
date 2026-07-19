import type { Metadata } from "next";
import { requerirRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PanelFinanzas } from "@/components/finanzas/PanelFinanzas";
import {
  resumen,
  agrupar,
  ETIQUETA_TIPO_PAGO,
  ETIQUETA_METODO,
} from "@/lib/finanzas";
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

  const supabase = await createClient();
  const [
    { data: pagosRaw },
    { data: gastosRaw },
    { data: catsRaw },
    { data: pagosPrevRaw },
    { data: gastosPrevRaw },
  ] = await Promise.all([
    supabase.from("pagos").select("monto, tipo, metodo_pago").gte("fecha", desde).lte("fecha", hasta),
    supabase.from("gastos").select("monto, categoria_id").gte("fecha", desde).lte("fecha", hasta),
    supabase.from("categorias_gasto").select("id, nombre"),
    supabase.from("pagos").select("monto").gte("fecha", prevDesde).lte("fecha", prevHasta),
    supabase.from("gastos").select("monto").gte("fecha", prevDesde).lte("fecha", prevHasta),
  ]);

  const pagos = (pagosRaw as Pick<Pago, "monto" | "tipo" | "metodo_pago">[] | null) ?? [];
  const gastos = (gastosRaw as Pick<Gasto, "monto" | "categoria_id">[] | null) ?? [];
  const cats = new Map(
    ((catsRaw as Pick<CategoriaGasto, "id" | "nombre">[] | null) ?? []).map((c) => [c.id, c.nombre]),
  );
  const pagosPrev = (pagosPrevRaw as Pick<Pago, "monto">[] | null) ?? [];
  const gastosPrev = (gastosPrevRaw as Pick<Gasto, "monto">[] | null) ?? [];

  const actual = resumen(pagos, gastos);
  const prev = resumen(pagosPrev, gastosPrev);

  const porCategoria = agrupar(
    gastos,
    (g) => cats.get(g.categoria_id ?? "") ?? "Sin categoría",
    (g) => g.monto,
  );
  const porTipo = agrupar(pagos, (p) => ETIQUETA_TIPO_PAGO[p.tipo], (p) => p.monto);
  const porMetodo = agrupar(pagos, (p) => ETIQUETA_METODO[p.metodo_pago], (p) => p.monto);

  return (
    <PanelFinanzas
      desde={desde}
      hasta={hasta}
      actual={actual}
      previo={{ ingresos: prev.ingresos, egresos: prev.egresos, balance: prev.balance }}
      porCategoria={porCategoria}
      porTipo={porTipo}
      porMetodo={porMetodo}
    />
  );
}
