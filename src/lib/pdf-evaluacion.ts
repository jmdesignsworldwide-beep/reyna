import "server-only";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Evaluacion } from "@/types/database";
import { riesgoCV, EXPLORACION_CAMPOS } from "@/lib/evaluaciones";

const ROSA = rgb(0.694, 0.29, 0.451); // #B14A73
const ROSA_CLARA = rgb(0.984, 0.933, 0.953); // #FBEEF3-ish
const TEXTO = rgb(0.353, 0.29, 0.322); // #5A4A52
const SECUND = rgb(0.541, 0.42, 0.471); // #8A6B78

const CORAZON =
  "M12 21s-9-5.4-9-12a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.6-9 12-9 12z";

export interface DatosPdfEvaluacion {
  evaluacion: Evaluacion;
  pacienteNombre: string;
  pacienteCedula: string | null;
  edad: number | null;
  sexo: string | null;
  fechaTexto: string; // DD/MM/AAAA de la evaluación
  firmaFechaTexto: string; // fecha/hora de firma
  hash: string;
}

function ddmmaaaa(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

export async function generarPdfEvaluacion(
  datos: DatosPdfEvaluacion,
): Promise<Uint8Array> {
  const e = datos.evaluacion;
  const doc = await PDFDocument.create();
  doc.setTitle(`Evaluación cardiológica — ${datos.pacienteNombre}`);
  doc.setProducer("Consultorio Dra. Reyna Massiel");
  doc.setCreator("JM Nexus Designs");

  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const sans = await doc.embedFont(StandardFonts.Helvetica);

  const A4 = { w: 595.28, h: 841.89 };
  const M = 54; // margen
  const anchoUtil = A4.w - M * 2;

  let page = doc.addPage([A4.w, A4.h]);
  let y = A4.h;

  function nuevaPagina() {
    page = doc.addPage([A4.w, A4.h]);
    y = A4.h - M;
  }
  function asegurar(espacio: number) {
    if (y - espacio < M + 40) nuevaPagina();
  }

  function wrap(texto: string, font: PDFFont, size: number, maxW: number): string[] {
    const lineas: string[] = [];
    for (const parrafo of texto.split("\n")) {
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

  function texto(
    t: string,
    x: number,
    size: number,
    font: PDFFont,
    color = TEXTO,
    maxW = anchoUtil,
  ) {
    const lineas = wrap(t, font, size, maxW);
    for (const l of lineas) {
      asegurar(size + 4);
      page.drawText(l, { x, y: y - size, size, font, color });
      y -= size + 4;
    }
  }

  function seccion(titulo: string) {
    asegurar(30);
    y -= 10;
    page.drawText(titulo.toUpperCase(), {
      x: M,
      y: y - 9,
      size: 9,
      font: sans,
      color: ROSA,
    });
    y -= 13;
    page.drawLine({
      start: { x: M, y },
      end: { x: A4.w - M, y },
      thickness: 0.6,
      color: rgb(0.9, 0.83, 0.86),
    });
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

  // ---------- Encabezado ----------
  page.drawRectangle({ x: 0, y: A4.h - 96, width: A4.w, height: 96, color: ROSA_CLARA });
  page.drawSvgPath(CORAZON, {
    x: M,
    y: A4.h - 34,
    scale: 1.4,
    color: ROSA,
  });
  page.drawText("Dra. Reyna Massiel", {
    x: M + 42,
    y: A4.h - 46,
    size: 22,
    font: serifBold,
    color: ROSA,
  });
  page.drawText("Cardiología · Medicina interna · Ecocardiografía", {
    x: M + 42,
    y: A4.h - 62,
    size: 10,
    font: serif,
    color: SECUND,
  });
  page.drawText("EVALUACIÓN CARDIOLÓGICA FORMAL", {
    x: M,
    y: A4.h - 86,
    size: 11,
    font: sans,
    color: TEXTO,
  });
  page.drawText(`Fecha: ${datos.fechaTexto}`, {
    x: A4.w - M - sans.widthOfTextAtSize(`Fecha: ${datos.fechaTexto}`, 10),
    y: A4.h - 86,
    size: 10,
    font: sans,
    color: SECUND,
  });
  y = A4.h - 96 - 18;

  // ---------- Identidad ----------
  seccion("Datos del paciente");
  const idLinea = [
    datos.pacienteNombre,
    datos.pacienteCedula ? `Cédula ${datos.pacienteCedula}` : null,
    datos.edad !== null ? `${datos.edad} años` : null,
    datos.sexo,
  ]
    .filter(Boolean)
    .join("   ·   ");
  texto(idLinea, M, 11, serifBold, TEXTO);
  y -= 2;

  // ---------- Motivo ----------
  if (e.motivo) {
    seccion("Motivo de la evaluación / referimiento");
    texto(e.motivo, M, 10.5, serif);
  }

  // ---------- Antecedentes ----------
  if (e.factores_riesgo || e.antecedentes || e.antecedentes_familiares) {
    seccion("Antecedentes relevantes");
    campo("Factores de riesgo", e.factores_riesgo);
    campo("Antecedentes personales", e.antecedentes);
    campo("Antecedentes familiares", e.antecedentes_familiares);
  }

  // ---------- Signos vitales ----------
  const vitales: string[] = [];
  if (e.ta_sistolica !== null && e.ta_diastolica !== null)
    vitales.push(`TA ${e.ta_sistolica}/${e.ta_diastolica} mmHg`);
  if (e.frecuencia_cardiaca !== null) vitales.push(`FC ${e.frecuencia_cardiaca} lpm`);
  if (e.peso !== null) vitales.push(`Peso ${e.peso} kg`);
  if (e.talla !== null) vitales.push(`Talla ${e.talla} cm`);
  if (e.imc !== null) vitales.push(`IMC ${e.imc}`);
  if (vitales.length > 0) {
    seccion("Signos vitales y antropometría");
    texto(vitales.join("   ·   "), M, 10.5, serif);
  }

  // ---------- Exploración cardiovascular ----------
  const exploracion = EXPLORACION_CAMPOS.filter(
    (c) => (e[c.clave] as string | null)?.toString().trim(),
  );
  if (exploracion.length > 0) {
    seccion("Exploración cardiovascular");
    for (const c of exploracion) campo(c.etiqueta, e[c.clave] as string);
  }

  // ---------- Estudios revisados ----------
  if (e.estudios_revisados.length > 0) {
    seccion("Estudios revisados");
    for (const s of e.estudios_revisados) {
      texto(`• ${s.tipo}${s.fecha ? ` — ${ddmmaaaa(s.fecha)}` : ""}`, M, 10.5, serif);
    }
  }

  // ---------- Impresión diagnóstica ----------
  if (e.impresion_diagnostica) {
    seccion("Impresión diagnóstica");
    texto(e.impresion_diagnostica, M, 10.5, serif);
  }

  // ---------- Recomendaciones ----------
  if (e.recomendaciones) {
    seccion("Recomendaciones y plan");
    texto(e.recomendaciones, M, 10.5, serif);
  }

  // ---------- Riesgo CV ----------
  const r = riesgoCV(e.riesgo_cv);
  if (r) {
    seccion("Estratificación de riesgo cardiovascular");
    texto(`Riesgo ${r.texto.toLowerCase()}`, M, 12, serifBold, ROSA);
  }

  // ---------- Consentimiento ----------
  if (e.consentimiento_texto) {
    seccion("Consentimiento informado");
    texto(e.consentimiento_texto, M, 10, serifItalic, SECUND);
  }

  // ---------- Firma ----------
  asegurar(120);
  y -= 24;
  const colW = anchoUtil / 2;
  const yFirma = y - 40;
  // Médico
  page.drawLine({
    start: { x: M, y: yFirma },
    end: { x: M + colW - 24, y: yFirma },
    thickness: 0.8,
    color: SECUND,
  });
  page.drawText(e.firma_medico_nombre ?? "Dra. Reyna Massiel", {
    x: M,
    y: yFirma - 13,
    size: 10.5,
    font: serifBold,
    color: TEXTO,
  });
  page.drawText("Médico tratante", { x: M, y: yFirma - 26, size: 8, font: sans, color: SECUND });
  page.drawText(`Firmado: ${datos.firmaFechaTexto}`, {
    x: M,
    y: yFirma - 38,
    size: 8,
    font: sans,
    color: SECUND,
  });
  // Paciente
  const px = M + colW + 24;
  page.drawLine({
    start: { x: px, y: yFirma },
    end: { x: A4.w - M, y: yFirma },
    thickness: 0.8,
    color: SECUND,
  });
  page.drawText(e.paciente_nombre_firma || datos.pacienteNombre, {
    x: px,
    y: yFirma - 13,
    size: 10.5,
    font: serifBold,
    color: TEXTO,
  });
  page.drawText(
    e.paciente_acepto ? "Paciente — consentimiento aceptado" : "Paciente",
    { x: px, y: yFirma - 26, size: 8, font: sans, color: SECUND },
  );
  y = yFirma - 54;

  // ---------- Sello de integridad + pie en todas las páginas ----------
  const paginas = doc.getPages();
  paginas.forEach((p: PDFPage, i: number) => {
    p.drawLine({
      start: { x: M, y: M - 6 },
      end: { x: A4.w - M, y: M - 6 },
      thickness: 0.5,
      color: rgb(0.9, 0.83, 0.86),
    });
    p.drawText("Documento sellado · JM Nexus Designs", {
      x: M,
      y: M - 20,
      size: 7,
      font: sans,
      color: SECUND,
    });
    const pag = `Página ${i + 1} de ${paginas.length}`;
    p.drawText(pag, {
      x: A4.w - M - sans.widthOfTextAtSize(pag, 7),
      y: M - 20,
      size: 7,
      font: sans,
      color: SECUND,
    });
    const sello = `SHA-256: ${datos.hash}`;
    p.drawText(sello.length > 92 ? sello.slice(0, 92) : sello, {
      x: M,
      y: M - 30,
      size: 6,
      font: sans,
      color: rgb(0.72, 0.62, 0.66),
    });
  });

  const bytes = await doc.save();
  return bytes;
}
