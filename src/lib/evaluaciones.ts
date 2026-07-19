import type { Evaluacion, RiesgoCV } from "@/types/database";

export const ETIQUETA_ESTADO_EVALUACION: Record<
  Evaluacion["estado"],
  string
> = {
  borrador: "Borrador",
  firmada: "Firmada",
};

export const RIESGO_CV: { valor: RiesgoCV; texto: string; color: string }[] = [
  { valor: "bajo", texto: "Bajo", color: "#4CAF82" },
  { valor: "moderado", texto: "Moderado", color: "#E8A13C" },
  { valor: "alto", texto: "Alto", color: "#E0567A" },
  { valor: "muy_alto", texto: "Muy alto", color: "#E0567A" },
];

export function riesgoCV(valor: RiesgoCV | null): {
  texto: string;
  color: string;
} | null {
  if (!valor) return null;
  return RIESGO_CV.find((r) => r.valor === valor) ?? null;
}

/** Sugiere una estratificación a partir del número de factores de riesgo. */
export function sugerirRiesgo(cantidadFactores: number): RiesgoCV {
  if (cantidadFactores === 0) return "bajo";
  if (cantidadFactores <= 2) return "moderado";
  if (cantidadFactores <= 4) return "alto";
  return "muy_alto";
}

/** Texto de consentimiento por defecto (editable en el borrador). */
export const CONSENTIMIENTO_POR_DEFECTO = `Declaro que he sido informado(a) de forma clara y comprensible sobre mi estado de salud cardiovascular, los hallazgos de esta evaluación, las recomendaciones indicadas y los estudios sugeridos. He tenido la oportunidad de preguntar y aclarar mis dudas. Autorizo a la Dra. Reyna Massiel a realizar la valoración y el plan aquí descritos, y consiento el manejo confidencial de mis datos clínicos conforme a la normativa aplicable.`;

/**
 * Contenido canónico de la evaluación (orden estable) para el hash de
 * integridad. Cualquier alteración del contenido cambia el hash.
 */
export function contenidoCanonico(e: Evaluacion): string {
  const campos: (keyof Evaluacion)[] = [
    "paciente_id",
    "fecha",
    "motivo",
    "antecedentes",
    "antecedentes_familiares",
    "factores_riesgo",
    "ta_sistolica",
    "ta_diastolica",
    "frecuencia_cardiaca",
    "peso",
    "talla",
    "imc",
    "ex_inspeccion",
    "ex_auscultacion",
    "ex_ruidos_cardiacos",
    "ex_soplos",
    "ex_pulsos",
    "ex_edemas",
    "ex_ingurgitacion",
    "ex_otros",
    "estudios_revisados",
    "impresion_diagnostica",
    "recomendaciones",
    "riesgo_cv",
    "consentimiento_texto",
    "paciente_acepto",
    "paciente_nombre_firma",
    "firma_medico_nombre",
  ];
  const obj: Record<string, unknown> = {};
  for (const k of campos) obj[k] = e[k] ?? null;
  return JSON.stringify(obj);
}

export const EXPLORACION_CAMPOS: {
  clave: keyof Evaluacion;
  etiqueta: string;
  placeholder: string;
}[] = [
  { clave: "ex_inspeccion", etiqueta: "Inspección general", placeholder: "Aspecto, coloración, disnea…" },
  { clave: "ex_auscultacion", etiqueta: "Auscultación pulmonar", placeholder: "Murmullo vesicular, estertores…" },
  { clave: "ex_ruidos_cardiacos", etiqueta: "Ruidos cardíacos", placeholder: "R1, R2, ritmo, galope…" },
  { clave: "ex_soplos", etiqueta: "Soplos", placeholder: "Localización, intensidad, irradiación…" },
  { clave: "ex_pulsos", etiqueta: "Pulsos periféricos", placeholder: "Simetría, amplitud…" },
  { clave: "ex_edemas", etiqueta: "Edemas", placeholder: "Miembros inferiores, godet…" },
  { clave: "ex_ingurgitacion", etiqueta: "Ingurgitación yugular", placeholder: "Presente / ausente…" },
  { clave: "ex_otros", etiqueta: "Otros hallazgos", placeholder: "Cualquier hallazgo adicional…" },
];
