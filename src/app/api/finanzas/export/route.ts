import { NextResponse, type NextRequest } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { requerirApi } from "@/lib/api-guard";
import { createClient } from "@/lib/supabase/server";
import {
  formatearRD,
  resumen,
  agrupar,
  ticket,
  porcentajeMargen,
  ETIQUETA_TIPO_PAGO,
  ETIQUETA_METODO,
} from "@/lib/finanzas";
import { formatearFecha } from "@/lib/formato";
import type { Pago, Gasto, CategoriaGasto } from "@/types/database";

export const runtime = "nodejs";

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

type PagoExp = Pick<Pago, "fecha" | "monto" | "tipo" | "concepto" | "metodo_pago" | "paciente_id" | "cita_id">;
type GastoExp = Pick<Gasto, "fecha" | "monto" | "categoria_id" | "metodo_pago" | "nota">;

export async function GET(request: NextRequest) {
  // Panel financiero: solo administradoras.
  const guard = await requerirApi("admin");
  if (!guard.ok) return guard.respuesta;

  const sp = request.nextUrl.searchParams;
  const hoy = new Date().toISOString().slice(0, 10);
  const desde = FECHA.test(sp.get("desde") ?? "") ? sp.get("desde")! : hoy;
  const hasta = FECHA.test(sp.get("hasta") ?? "") ? sp.get("hasta")! : hoy;
  const formato = sp.get("formato") === "pdf" ? "pdf" : "csv";

  const supabase = await createClient();
  const [{ data: pagosRaw }, { data: gastosRaw }, { data: catsRaw }, { data: sedesRaw }] = await Promise.all([
    supabase
      .from("pagos")
      .select("fecha, monto, tipo, concepto, metodo_pago, paciente_id, cita_id")
      .gte("fecha", desde)
      .lte("fecha", hasta)
      .order("fecha", { ascending: true }),
    supabase
      .from("gastos")
      .select("fecha, monto, categoria_id, metodo_pago, nota")
      .gte("fecha", desde)
      .lte("fecha", hasta)
      .order("fecha", { ascending: true }),
    supabase.from("categorias_gasto").select("id, nombre"),
    supabase.from("sedes").select("id, nombre"),
  ]);

  const pagos = (pagosRaw as PagoExp[] | null) ?? [];
  const gastos = (gastosRaw as GastoExp[] | null) ?? [];
  const cats = new Map(
    ((catsRaw as Pick<CategoriaGasto, "id" | "nombre">[] | null) ?? []).map((c) => [c.id, c.nombre]),
  );
  const sedes = new Map(
    ((sedesRaw as { id: string; nombre: string }[] | null) ?? []).map((s) => [s.id, s.nombre]),
  );

  // Mapa cita → sede.
  const citaIds = [...new Set(pagos.map((p) => p.cita_id).filter(Boolean))] as string[];
  const citaSede = new Map<string, string>();
  if (citaIds.length > 0) {
    const { data: citasRaw } = await supabase.from("citas").select("id, sede_id").in("id", citaIds);
    for (const c of (citasRaw as { id: string; sede_id: string | null }[] | null) ?? []) {
      if (c.sede_id) citaSede.set(c.id, c.sede_id);
    }
  }
  const sedeDe = (p: PagoExp) =>
    p.cita_id && citaSede.get(p.cita_id) ? sedes.get(citaSede.get(p.cita_id)!) ?? "Otra sede" : "Sin sede asignada";

  const r = resumen(pagos, gastos);
  const margen = porcentajeMargen(r.ingresos, r.egresos);
  const pacientes = new Set(pagos.map((p) => p.paciente_id).filter(Boolean)).size;
  const ticketProm = ticket(r.ingresos, r.cantidadPagos);
  const porTipo = agrupar(pagos, (p) => ETIQUETA_TIPO_PAGO[p.tipo], (p) => p.monto);
  const porMetodo = agrupar(pagos, (p) => ETIQUETA_METODO[p.metodo_pago], (p) => p.monto);
  const porSede = agrupar(pagos, (p) => sedeDe(p), (p) => p.monto);
  const porCat = agrupar(gastos, (g) => cats.get(g.categoria_id ?? "") ?? "Sin categoría", (g) => g.monto);
  const nombreArchivo = `finanzas_${desde}_a_${hasta}`;

  if (formato === "csv") {
    const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const filas: string[] = [];
    filas.push(q(`Reporte financiero · Dra. Reyna Massiel`));
    filas.push(q(`Período: ${formatearFecha(desde)} a ${formatearFecha(hasta)}`));
    filas.push("");
    filas.push("Indicador,Valor");
    filas.push(`${q("Ingresos")},"${r.ingresos.toFixed(2)}"`);
    filas.push(`${q("Egresos")},"${r.egresos.toFixed(2)}"`);
    filas.push(`${q("Balance")},"${r.balance.toFixed(2)}"`);
    filas.push(`${q("Margen (%)")},"${margen}"`);
    filas.push(`${q("Ticket promedio")},"${ticketProm.toFixed(2)}"`);
    filas.push(`${q("Pacientes atendidos")},"${pacientes}"`);
    filas.push(`${q("Cantidad de pagos")},"${r.cantidadPagos}"`);
    filas.push(`${q("Cantidad de gastos")},"${r.cantidadGastos}"`);

    const bloque = (titulo: string, grupos: { clave: string; total: number; porcentaje: number }[]) => {
      filas.push("");
      filas.push(`${q(titulo)},Monto,%`);
      if (grupos.length === 0) filas.push(`${q("Sin datos")},,`);
      for (const g of grupos) filas.push(`${q(g.clave)},"${g.total.toFixed(2)}","${g.porcentaje}"`);
    };
    bloque("Ingresos por servicio", porTipo);
    bloque("Ingresos por sede", porSede);
    bloque("Ingresos por método de pago", porMetodo);
    bloque("Gastos por categoría", porCat);

    filas.push("");
    filas.push("Detalle de movimientos");
    filas.push("Tipo,Fecha,Concepto,Método,Monto");
    for (const p of pagos) {
      filas.push(
        [
          "Ingreso",
          formatearFecha(p.fecha),
          q(p.concepto?.trim() || ETIQUETA_TIPO_PAGO[p.tipo]),
          ETIQUETA_METODO[p.metodo_pago],
          p.monto.toFixed(2),
        ].join(","),
      );
    }
    for (const g of gastos) {
      filas.push(
        [
          "Gasto",
          formatearFecha(g.fecha),
          q(cats.get(g.categoria_id ?? "") ?? g.nota?.trim() ?? "Gasto"),
          ETIQUETA_METODO[g.metodo_pago],
          (-g.monto).toFixed(2),
        ].join(","),
      );
    }

    const csv = "﻿" + filas.join("\r\n"); // BOM para acentos en Excel
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${nombreArchivo}.csv"`,
      },
    });
  }

  // ---------- PDF reporte ----------
  const doc = await PDFDocument.create();
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const ROSA = rgb(0.694, 0.29, 0.451);
  const TEXTO = rgb(0.353, 0.29, 0.322);
  const SECUND = rgb(0.541, 0.42, 0.471);
  const VERDE = rgb(0.298, 0.686, 0.51);
  const ROJO = rgb(0.878, 0.337, 0.478);
  const W = 595.28;
  const H = 841.89;
  const M = 54;
  let page = doc.addPage([W, H]);
  let y = H - M;

  const nuevaPaginaSiHaceFalta = (necesita: number) => {
    if (y - necesita < M + 24) {
      page = doc.addPage([W, H]);
      y = H - M;
    }
  };

  page.drawText("Dra. Reyna Massiel", { x: M, y: y - 18, size: 18, font: serifBold, color: ROSA });
  y -= 24;
  page.drawText("Reporte financiero", { x: M, y: y - 14, size: 12, font: sans, color: TEXTO });
  y -= 18;
  page.drawText(`Período: ${formatearFecha(desde)} — ${formatearFecha(hasta)}`, {
    x: M,
    y: y - 12,
    size: 10,
    font: serif,
    color: SECUND,
  });
  y -= 34;

  const linea = (et: string, val: string, color = TEXTO, size = 12) => {
    page.drawText(et, { x: M, y: y - size, size: 10, font: sans, color: SECUND });
    page.drawText(val, {
      x: W - M - serifBold.widthOfTextAtSize(val, size),
      y: y - size,
      size,
      font: serifBold,
      color,
    });
    y -= size + 12;
  };
  linea("Ingresos", formatearRD(r.ingresos), VERDE, 14);
  linea("Egresos", formatearRD(r.egresos), ROJO, 14);
  linea("Balance", formatearRD(r.balance), ROSA, 16);
  linea("Margen de ganancia", `${margen}%`, TEXTO, 12);
  linea("Ticket promedio", formatearRD(ticketProm), TEXTO, 12);
  linea("Pacientes atendidos", String(pacientes), TEXTO, 12);

  const seccion = (titulo: string, grupos: { clave: string; total: number; porcentaje: number }[]) => {
    nuevaPaginaSiHaceFalta(60);
    y -= 8;
    page.drawText(titulo.toUpperCase(), { x: M, y: y - 9, size: 9, font: sans, color: ROSA });
    y -= 20;
    if (grupos.length === 0) {
      page.drawText("Sin datos en el período.", { x: M, y: y - 11, size: 10, font: serif, color: SECUND });
      y -= 18;
      return;
    }
    for (const c of grupos) {
      nuevaPaginaSiHaceFalta(20);
      page.drawText(c.clave, { x: M, y: y - 11, size: 10, font: serif, color: TEXTO });
      const val = `${formatearRD(c.total)}  ·  ${c.porcentaje}%`;
      page.drawText(val, {
        x: W - M - serif.widthOfTextAtSize(val, 10),
        y: y - 11,
        size: 10,
        font: serif,
        color: TEXTO,
      });
      y -= 18;
    }
  };
  seccion("Ingresos por servicio", porTipo);
  seccion("Ingresos por sede", porSede);
  seccion("Ingresos por método de pago", porMetodo);
  seccion("Gastos por categoría", porCat);

  // Pie en la última página.
  page.drawText("Diseñado por JM Nexus Designs", { x: M, y: M, size: 7, font: sans, color: SECUND });

  const bytes = await doc.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nombreArchivo}.pdf"`,
    },
  });
}
