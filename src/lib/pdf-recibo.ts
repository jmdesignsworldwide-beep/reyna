import "server-only";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const ROSA = rgb(0.694, 0.29, 0.451);
const ROSA_CLARA = rgb(0.984, 0.933, 0.953);
const TEXTO = rgb(0.353, 0.29, 0.322);
const SECUND = rgb(0.541, 0.42, 0.471);

const CORAZON = "M12 21s-9-5.4-9-12a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.6-9 12-9 12z";

export interface DatosRecibo {
  reciboNumero: string; // REC-000123
  fechaTexto: string;
  pacienteNombre: string;
  pacienteCedula: string | null;
  tipoTexto: string;
  concepto: string | null;
  montoTexto: string; // RD$ 1,500.00
  metodoTexto: string;
  ncf: string | null;
  notas: string | null;
}

export async function generarPdfRecibo(d: DatosRecibo): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Recibo ${d.reciboNumero} — ${d.pacienteNombre}`);
  doc.setProducer("Consultorio Dra. Reyna Massiel");
  doc.setCreator("JM Nexus Designs");

  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const sans = await doc.embedFont(StandardFonts.Helvetica);

  // Media carta apaisada-ish: usamos A5 vertical (recibo compacto).
  const W = 419.53; // A5 width
  const H = 595.28; // A5 height
  const M = 40;
  const page = doc.addPage([W, H]);

  // Encabezado
  page.drawRectangle({ x: 0, y: H - 92, width: W, height: 92, color: ROSA_CLARA });
  page.drawSvgPath(CORAZON, { x: M, y: H - 30, scale: 1.3, color: ROSA });
  page.drawText("Dra. Reyna Massiel", {
    x: M + 40,
    y: H - 42,
    size: 18,
    font: serifBold,
    color: ROSA,
  });
  page.drawText("Cardiología · Medicina interna · Ecocardiografía", {
    x: M + 40,
    y: H - 57,
    size: 8.5,
    font: serif,
    color: SECUND,
  });
  page.drawText("RECIBO DE PAGO", { x: M, y: H - 82, size: 10, font: sans, color: TEXTO });
  const rn = d.reciboNumero;
  page.drawText(rn, {
    x: W - M - sans.widthOfTextAtSize(rn, 10),
    y: H - 82,
    size: 10,
    font: sans,
    color: ROSA,
  });

  let y = H - 92 - 28;

  function fila(etiqueta: string, valor: string) {
    page.drawText(etiqueta, { x: M, y, size: 8.5, font: sans, color: SECUND });
    page.drawText(valor, { x: M + 110, y, size: 11, font: serif, color: TEXTO });
    y -= 22;
  }

  fila("Fecha", d.fechaTexto);
  fila("Recibido de", d.pacienteNombre);
  if (d.pacienteCedula) fila("Cédula", d.pacienteCedula);
  fila("Concepto", d.concepto?.trim() ? d.concepto : d.tipoTexto);
  fila("Método de pago", d.metodoTexto);
  if (d.ncf?.trim()) fila("NCF", d.ncf);

  // Monto destacado
  y -= 8;
  page.drawLine({
    start: { x: M, y },
    end: { x: W - M, y },
    thickness: 0.6,
    color: rgb(0.9, 0.83, 0.86),
  });
  y -= 30;
  page.drawText("Total pagado", { x: M, y, size: 10, font: sans, color: SECUND });
  page.drawText(d.montoTexto, {
    x: W - M - serifBold.widthOfTextAtSize(d.montoTexto, 22),
    y: y - 4,
    size: 22,
    font: serifBold,
    color: ROSA,
  });
  y -= 40;

  if (d.notas?.trim()) {
    page.drawText("Notas", { x: M, y, size: 8.5, font: sans, color: SECUND });
    y -= 14;
    page.drawText(d.notas.slice(0, 90), { x: M, y, size: 10, font: serif, color: TEXTO });
    y -= 20;
  }

  // Firma
  y -= 30;
  page.drawLine({
    start: { x: M, y },
    end: { x: M + 180, y },
    thickness: 0.8,
    color: SECUND,
  });
  page.drawText("Dra. Reyna Massiel", { x: M, y: y - 13, size: 10, font: serifBold, color: TEXTO });

  // Pie
  if (!d.ncf?.trim()) {
    page.drawText("Este recibo no tiene valor fiscal (no es un comprobante fiscal DGII).", {
      x: M,
      y: M + 24,
      size: 7,
      font: sans,
      color: SECUND,
    });
  }
  page.drawLine({
    start: { x: M, y: M + 14 },
    end: { x: W - M, y: M + 14 },
    thickness: 0.5,
    color: rgb(0.9, 0.83, 0.86),
  });
  page.drawText("Diseñado por JM Nexus Designs", {
    x: M,
    y: M,
    size: 7,
    font: sans,
    color: SECUND,
  });

  return doc.save();
}
