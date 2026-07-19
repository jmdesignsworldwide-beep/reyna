import { NextResponse, type NextRequest } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { requerirApi } from "@/lib/api-guard";
import { createClient } from "@/lib/supabase/server";
import {
  formatearRD,
  resumen,
  agrupar,
  ETIQUETA_TIPO_PAGO,
  ETIQUETA_METODO,
} from "@/lib/finanzas";
import { formatearFecha } from "@/lib/formato";
import type { Pago, Gasto, CategoriaGasto } from "@/types/database";

export const runtime = "nodejs";

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

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
  const [{ data: pagosRaw }, { data: gastosRaw }, { data: catsRaw }] = await Promise.all([
    supabase
      .from("pagos")
      .select("fecha, monto, tipo, concepto, metodo_pago")
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
  ]);

  const pagos = (pagosRaw as Pick<Pago, "fecha" | "monto" | "tipo" | "concepto" | "metodo_pago">[] | null) ?? [];
  const gastos = (gastosRaw as Pick<Gasto, "fecha" | "monto" | "categoria_id" | "metodo_pago" | "nota">[] | null) ?? [];
  const cats = new Map(
    ((catsRaw as Pick<CategoriaGasto, "id" | "nombre">[] | null) ?? []).map((c) => [c.id, c.nombre]),
  );
  const r = resumen(pagos, gastos);
  const nombreArchivo = `finanzas_${desde}_a_${hasta}`;

  if (formato === "csv") {
    const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const filas: string[] = ["Tipo,Fecha,Concepto,Método,Monto"];
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
    filas.push("");
    filas.push(`${q("Ingresos")},,,,"${r.ingresos.toFixed(2)}"`);
    filas.push(`${q("Egresos")},,,,"${r.egresos.toFixed(2)}"`);
    filas.push(`${q("Balance")},,,,"${r.balance.toFixed(2)}"`);

    const csv = "﻿" + filas.join("\r\n"); // BOM para acentos en Excel
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${nombreArchivo}.csv"`,
      },
    });
  }

  // ---------- PDF resumen ----------
  const doc = await PDFDocument.create();
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const ROSA = rgb(0.694, 0.29, 0.451);
  const TEXTO = rgb(0.353, 0.29, 0.322);
  const SECUND = rgb(0.541, 0.42, 0.471);
  const W = 595.28;
  const H = 841.89;
  const M = 54;
  const page = doc.addPage([W, H]);
  let y = H - M;

  page.drawText("Dra. Reyna Massiel", { x: M, y: y - 18, size: 18, font: serifBold, color: ROSA });
  y -= 24;
  page.drawText("Resumen financiero", { x: M, y: y - 14, size: 12, font: sans, color: TEXTO });
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
  linea("Ingresos", formatearRD(r.ingresos), rgb(0.298, 0.686, 0.51), 14);
  linea("Egresos", formatearRD(r.egresos), rgb(0.878, 0.337, 0.478), 14);
  linea("Balance", formatearRD(r.balance), ROSA, 16);

  y -= 10;
  page.drawText("GASTOS POR CATEGORÍA", { x: M, y: y - 9, size: 9, font: sans, color: ROSA });
  y -= 20;
  const porCat = agrupar(
    gastos,
    (g) => cats.get(g.categoria_id ?? "") ?? "Sin categoría",
    (g) => g.monto,
  );
  if (porCat.length === 0) {
    page.drawText("Sin gastos en el período.", { x: M, y: y - 11, size: 10, font: serif, color: SECUND });
    y -= 20;
  } else {
    for (const c of porCat) {
      page.drawText(`${c.clave}`, { x: M, y: y - 11, size: 10, font: serif, color: TEXTO });
      page.drawText(`${formatearRD(c.total)}  ·  ${c.porcentaje}%`, {
        x: W - M - serif.widthOfTextAtSize(`${formatearRD(c.total)}  ·  ${c.porcentaje}%`, 10),
        y: y - 11,
        size: 10,
        font: serif,
        color: TEXTO,
      });
      y -= 18;
    }
  }

  page.drawText("Diseñado por JM Nexus Designs", { x: M, y: M, size: 7, font: sans, color: SECUND });

  const bytes = await doc.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nombreArchivo}.pdf"`,
    },
  });
}
