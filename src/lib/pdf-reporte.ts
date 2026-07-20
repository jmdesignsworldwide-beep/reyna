import "server-only";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { TipoReporte } from "@/types/database";
import { MEDICO, CORAZON, MARCA_RGB } from "@/lib/membrete";
import { ETIQUETA_TIPO_REPORTE, type ContenidoReporte } from "@/lib/reportes";

const ROSA = rgb(...MARCA_RGB.rosa);
const ROSA_CLARA = rgb(...MARCA_RGB.rosaClara);
const TEXTO = rgb(...MARCA_RGB.texto);
const SECUND = rgb(...MARCA_RGB.secundario);
const LINEA = rgb(...MARCA_RGB.linea);

export interface DatosPdfReporte {
  tipo: TipoReporte;
  titulo: string;
  contenido: ContenidoReporte;
  fechaTexto: string; // DD/MM/AAAA
  generadoPor: string;
  generadoFechaTexto: string;
}

export async function generarPdfReporte(datos: DatosPdfReporte): Promise<Uint8Array> {
  const { contenido: c } = datos;
  const doc = await PDFDocument.create();
  doc.setTitle(`${ETIQUETA_TIPO_REPORTE[datos.tipo]} — ${c.paciente.nombre}`);
  doc.setProducer("Consultorio Dra. Reyna Massiel");
  doc.setCreator(MEDICO.marca);

  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const sans = await doc.embedFont(StandardFonts.Helvetica);

  const A4 = { w: 595.28, h: 841.89 };
  const M = 54;
  const anchoUtil = A4.w - M * 2;

  let page = doc.addPage([A4.w, A4.h]);
  let y = A4.h;

  function nuevaPagina() {
    page = doc.addPage([A4.w, A4.h]);
    y = A4.h - M;
  }
  function asegurar(espacio: number) {
    if (y - espacio < M + 44) nuevaPagina();
  }
  function wrap(t: string, font: PDFFont, size: number, maxW: number): string[] {
    const lineas: string[] = [];
    for (const parrafo of t.split("\n")) {
      if (parrafo.trim() === "") {
        lineas.push("");
        continue;
      }
      let actual = "";
      for (const palabra of parrafo.split(/\s+/)) {
        const prueba = actual ? `${actual} ${palabra}` : palabra;
        if (font.widthOfTextAtSize(prueba, size) > maxW && actual) {
          lineas.push(actual);
          actual = palabra;
        } else {
          actual = prueba;
        }
      }
      if (actual) lineas.push(actual);
    }
    return lineas;
  }
  function texto(t: string, x: number, size: number, font: PDFFont, color = TEXTO, maxW = anchoUtil) {
    for (const l of wrap(t, font, size, maxW)) {
      asegurar(size + 4);
      page.drawText(l, { x, y: y - size, size, font, color });
      y -= size + 4;
    }
  }
  function seccion(titulo: string) {
    asegurar(30);
    y -= 10;
    page.drawText(titulo.toUpperCase(), { x: M, y: y - 9, size: 9, font: sans, color: ROSA });
    y -= 13;
    page.drawLine({ start: { x: M, y }, end: { x: A4.w - M, y }, thickness: 0.6, color: LINEA });
    y -= 8;
  }
  function campo(etiqueta: string, valor: string | null | undefined) {
    if (!valor || valor.toString().trim() === "") return;
    asegurar(18);
    page.drawText(etiqueta, { x: M, y: y - 9, size: 8, font: sans, color: SECUND });
    y -= 12;
    texto(valor.toString(), M, 10.5, serif, TEXTO);
    y -= 3;
  }
  function vinetas(items: string[]) {
    for (const it of items) texto(`•  ${it}`, M + 4, 10.5, serif, TEXTO, anchoUtil - 4);
  }

  // ---------- Encabezado / membrete ----------
  page.drawRectangle({ x: 0, y: A4.h - 96, width: A4.w, height: 96, color: ROSA_CLARA });
  page.drawSvgPath(CORAZON, { x: M, y: A4.h - 34, scale: 1.4, color: ROSA });
  page.drawText(MEDICO.nombre, { x: M + 42, y: A4.h - 46, size: 22, font: serifBold, color: ROSA });
  page.drawText(MEDICO.especialidad, { x: M + 42, y: A4.h - 62, size: 10, font: serif, color: SECUND });
  if (MEDICO.exequatur.trim()) {
    page.drawText(MEDICO.exequatur, { x: M + 42, y: A4.h - 74, size: 8.5, font: serif, color: SECUND });
  }
  page.drawText(datos.titulo.toUpperCase(), { x: M, y: A4.h - 86, size: 11, font: sans, color: TEXTO });
  const fechaLbl = `Fecha: ${datos.fechaTexto}`;
  page.drawText(fechaLbl, {
    x: A4.w - M - sans.widthOfTextAtSize(fechaLbl, 10),
    y: A4.h - 86,
    size: 10,
    font: sans,
    color: SECUND,
  });
  y = A4.h - 96 - 18;

  // ---------- Datos del paciente ----------
  seccion("Datos del paciente");
  const idLinea = [
    c.paciente.nombre,
    c.paciente.cedula ? `Cédula ${c.paciente.cedula}` : null,
    c.paciente.edad !== null ? `${c.paciente.edad} años` : null,
    c.paciente.sexo,
  ]
    .filter(Boolean)
    .join("   ·   ");
  texto(idLinea, M, 11, serifBold, TEXTO);
  y -= 2;

  // ---------- Contenido según tipo ----------
  if (datos.tipo === "resumen_consulta" && c.consulta) {
    const co = c.consulta;
    seccion("Datos de la consulta");
    campo("Tipo", co.tipo);
    campo("Fecha", co.fecha);
    campo("Motivo", co.motivo);
    if (co.vitales.length) {
      seccion("Signos vitales");
      texto(co.vitales.join("   ·   "), M, 10.5, serif);
    }
    if (co.diagnosticos.length) {
      seccion("Diagnóstico");
      vinetas(co.diagnosticos);
    }
    if (co.plan) {
      seccion("Plan y conducta");
      texto(co.plan, M, 10.5, serif);
    }
    if (co.prescripcion.length) {
      seccion("Prescripción");
      vinetas(co.prescripcion);
    }
    if (co.indicaciones) {
      seccion("Indicaciones para el paciente");
      texto(co.indicaciones, M, 10.5, serif);
    }
    if (co.proxima_reevaluacion) {
      seccion("Próxima reevaluación");
      texto(co.proxima_reevaluacion, M, 10.5, serif);
    }
  } else if (datos.tipo === "resultado_estudio" && c.estudio) {
    const e = c.estudio;
    seccion("Estudio realizado");
    campo("Tipo de estudio", e.tipo);
    campo("Fecha", e.fecha);
    campo("Realizado por", e.realizado_por);
    if (e.hallazgos) {
      seccion("Hallazgos");
      texto(e.hallazgos, M, 10.5, serif);
    }
    if (e.conclusion) {
      seccion("Conclusión");
      texto(e.conclusion, M, 11, serifBold, TEXTO);
    }
  } else if (datos.tipo === "reporte_general" && c.general) {
    const g = c.general;
    seccion("Riesgo cardiovascular");
    texto(g.riesgo, M, 12, serifBold, ROSA);
    if (g.factores.length) {
      seccion("Factores de riesgo");
      vinetas(g.factores);
    }
    if (g.alergias) {
      seccion("Alergias");
      texto(g.alergias, M, 10.5, serif);
    }
    if (g.medicacion.length) {
      seccion("Medicación actual");
      vinetas(g.medicacion);
    }
    if (g.ultimasConsultas.length) {
      seccion("Últimas consultas");
      for (const u of g.ultimasConsultas) {
        texto(`${u.fecha} — ${u.resumen}`, M, 10.5, serif);
      }
    }
  }

  // ---------- Firma del médico ----------
  asegurar(90);
  y -= 30;
  const yFirma = y - 30;
  page.drawLine({ start: { x: M, y: yFirma }, end: { x: M + 240, y: yFirma }, thickness: 0.8, color: SECUND });
  page.drawText(MEDICO.nombre, { x: M, y: yFirma - 13, size: 10.5, font: serifBold, color: TEXTO });
  page.drawText("Médico tratante", { x: M, y: yFirma - 26, size: 8, font: sans, color: SECUND });

  // ---------- Pie en todas las páginas ----------
  const paginas = doc.getPages();
  paginas.forEach((p: PDFPage, i: number) => {
    p.drawLine({ start: { x: M, y: M - 6 }, end: { x: A4.w - M, y: M - 6 }, thickness: 0.5, color: LINEA });
    const pie = `Generado por ${datos.generadoPor} · ${datos.generadoFechaTexto}`;
    p.drawText(pie.length > 92 ? pie.slice(0, 92) : pie, { x: M, y: M - 20, size: 7, font: sans, color: SECUND });
    p.drawText(`${MEDICO.marca}`, { x: M, y: M - 30, size: 7, font: sans, color: rgb(0.72, 0.62, 0.66) });
    const pag = `Página ${i + 1} de ${paginas.length}`;
    p.drawText(pag, {
      x: A4.w - M - sans.widthOfTextAtSize(pag, 7),
      y: M - 20,
      size: 7,
      font: sans,
      color: SECUND,
    });
  });

  return doc.save();
}
