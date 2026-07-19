"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requerirUsuaria } from "@/lib/auth";
import { evaluacionSchema, firmarEvaluacionSchema } from "@/lib/validaciones";
import { limitarTasa } from "@/lib/rate-limit";
import { registrarAuditoria } from "@/lib/audit";
import { puedeUI } from "@/lib/permissions";
import { contenidoCanonico } from "@/lib/evaluaciones";
import { generarPdfEvaluacion } from "@/lib/pdf-evaluacion";
import { calcularEdad, formatearFecha, formatearFechaHora } from "@/lib/formato";
import { ETIQUETA_SEXO } from "@/lib/cardio";
import type { Evaluacion, EstudioRevisado } from "@/types/database";

export interface ResultadoEvaluacion {
  ok: boolean;
  error?: string;
  id?: string;
}

const UUID = /^[0-9a-f-]{36}$/i;

function texto(fd: FormData, k: string): string {
  return (fd.get(k) as string | null)?.trim() ?? "";
}
function numero(fd: FormData, k: string): number | null {
  const v = texto(fd, k);
  if (v === "") return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function extraer(fd: FormData) {
  let estudios: EstudioRevisado[] = [];
  try {
    const arr = JSON.parse((fd.get("estudios_revisados") as string) || "[]");
    if (Array.isArray(arr)) {
      estudios = arr
        .map((s) => ({
          id: String(s?.id ?? ""),
          tipo: String(s?.tipo ?? ""),
          fecha: String(s?.fecha ?? ""),
        }))
        .filter((s) => s.id !== "");
    }
  } catch {
    estudios = [];
  }
  const riesgo = texto(fd, "riesgo_cv");
  return {
    fecha: texto(fd, "fecha"),
    motivo: texto(fd, "motivo"),
    antecedentes: texto(fd, "antecedentes"),
    antecedentes_familiares: texto(fd, "antecedentes_familiares"),
    factores_riesgo: texto(fd, "factores_riesgo"),
    ta_sistolica: numero(fd, "ta_sistolica"),
    ta_diastolica: numero(fd, "ta_diastolica"),
    frecuencia_cardiaca: numero(fd, "frecuencia_cardiaca"),
    peso: numero(fd, "peso"),
    talla: numero(fd, "talla"),
    ex_inspeccion: texto(fd, "ex_inspeccion"),
    ex_auscultacion: texto(fd, "ex_auscultacion"),
    ex_ruidos_cardiacos: texto(fd, "ex_ruidos_cardiacos"),
    ex_soplos: texto(fd, "ex_soplos"),
    ex_pulsos: texto(fd, "ex_pulsos"),
    ex_edemas: texto(fd, "ex_edemas"),
    ex_ingurgitacion: texto(fd, "ex_ingurgitacion"),
    ex_otros: texto(fd, "ex_otros"),
    estudios_revisados: estudios,
    impresion_diagnostica: texto(fd, "impresion_diagnostica"),
    recomendaciones: texto(fd, "recomendaciones"),
    riesgo_cv: (riesgo === "" ? null : riesgo) as
      | "bajo"
      | "moderado"
      | "alto"
      | "muy_alto"
      | null,
    consentimiento_texto: texto(fd, "consentimiento_texto"),
  };
}

function aFila(datos: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(datos)) out[k] = v === "" ? null : v;
  return out;
}

export async function crearEvaluacion(
  pacienteId: string,
  formData: FormData,
): Promise<ResultadoEvaluacion> {
  const usuaria = await requerirUsuaria();
  if (!puedeUI(usuaria.rol, "evaluaciones", "crear")) {
    return { ok: false, error: "No tienes permiso para crear evaluaciones." };
  }
  if (!UUID.test(pacienteId)) return { ok: false, error: "Paciente inválido." };

  const permitido = await limitarTasa(`crear-evaluacion:${usuaria.id}`, 60, 3600);
  if (!permitido) return { ok: false, error: "Demasiadas solicitudes. Intenta más tarde." };

  const parseo = evaluacionSchema.safeParse(extraer(formData));
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("evaluaciones")
    .insert({
      ...aFila(parseo.data),
      paciente_id: pacienteId,
      created_by: usuaria.id,
    } as never)
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: "No se pudo crear la evaluación." };

  await registrarAuditoria({
    actorId: usuaria.id,
    actorEmail: usuaria.email,
    accion: "crear_evaluacion",
    entidad: "evaluaciones",
    entidadId: data.id,
    metadata: { paciente_id: pacienteId },
  });

  revalidatePath(`/panel/pacientes/${pacienteId}`);
  return { ok: true, id: data.id };
}

export async function actualizarEvaluacion(
  id: string,
  pacienteId: string,
  formData: FormData,
): Promise<ResultadoEvaluacion> {
  const usuaria = await requerirUsuaria();
  if (!puedeUI(usuaria.rol, "evaluaciones", "editar")) {
    return { ok: false, error: "No tienes permiso para editar evaluaciones." };
  }
  if (!UUID.test(id)) return { ok: false, error: "Evaluación inválida." };

  const parseo = evaluacionSchema.safeParse(extraer(formData));
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  // El trigger de BD impide modificar una evaluación firmada; damos mensaje claro.
  const { data: actual } = await supabase
    .from("evaluaciones")
    .select("estado")
    .eq("id", id)
    .single();
  if (actual?.estado === "firmada") {
    return { ok: false, error: "La evaluación ya está firmada y es inmutable." };
  }

  const { error } = await supabase
    .from("evaluaciones")
    .update(aFila(parseo.data) as never)
    .eq("id", id);

  if (error) return { ok: false, error: "No se pudo actualizar la evaluación." };

  await registrarAuditoria({
    actorId: usuaria.id,
    actorEmail: usuaria.email,
    accion: "actualizar_evaluacion",
    entidad: "evaluaciones",
    entidadId: id,
    metadata: { paciente_id: pacienteId },
  });

  revalidatePath(`/panel/pacientes/${pacienteId}`);
  revalidatePath(`/panel/pacientes/${pacienteId}/evaluaciones/${id}`);
  return { ok: true, id };
}

export async function eliminarEvaluacion(
  id: string,
  pacienteId: string,
): Promise<ResultadoEvaluacion> {
  const usuaria = await requerirUsuaria();
  if (!puedeUI(usuaria.rol, "evaluaciones", "borrar")) {
    return { ok: false, error: "No tienes permiso para eliminar evaluaciones." };
  }
  if (!UUID.test(id)) return { ok: false, error: "Evaluación inválida." };

  const supabase = await createClient();
  const { error } = await supabase.from("evaluaciones").delete().eq("id", id);
  if (error) {
    // 23514 = check_violation → el trigger bloqueó por estar firmada.
    const sellada =
      error.code === "23514" ||
      error.message?.toLowerCase().includes("inmutable");
    return {
      ok: false,
      error: sellada
        ? "La evaluación está firmada y es inmutable: no se puede eliminar."
        : "No se pudo eliminar la evaluación.",
    };
  }

  await registrarAuditoria({
    actorId: usuaria.id,
    actorEmail: usuaria.email,
    accion: "eliminar_evaluacion",
    entidad: "evaluaciones",
    entidadId: id,
    metadata: { paciente_id: pacienteId },
  });

  revalidatePath(`/panel/pacientes/${pacienteId}`);
  return { ok: true };
}

/**
 * Firma (sella) una evaluación. SOLO el médico (administradora) puede firmar.
 * Calcula el hash de integridad, genera el PDF, lo sube al bucket privado y
 * marca la evaluación como firmada en un único UPDATE (borrador → firmada);
 * a partir de ahí el trigger de BD la vuelve inmutable.
 */
export async function firmarEvaluacion(
  id: string,
  pacienteId: string,
  formData: FormData,
): Promise<ResultadoEvaluacion> {
  const usuaria = await requerirUsuaria();
  // La firma es del médico: solo la administradora (Dra. Reyna).
  if (usuaria.rol !== "admin") {
    return { ok: false, error: "Solo el médico puede firmar la evaluación." };
  }
  if (!UUID.test(id)) return { ok: false, error: "Evaluación inválida." };

  const parseo = firmarEvaluacionSchema.safeParse({
    firma_medico_nombre: texto(formData, "firma_medico_nombre"),
    paciente_acepto: formData.get("paciente_acepto") === "true",
    paciente_nombre_firma: texto(formData, "paciente_nombre_firma"),
  });
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos de firma inválidos." };
  }

  const supabase = await createClient();

  const { data: evalData } = await supabase
    .from("evaluaciones")
    .select("*")
    .eq("id", id)
    .eq("paciente_id", pacienteId)
    .single();
  if (!evalData) return { ok: false, error: "No se encontró la evaluación." };
  const ev = evalData as Evaluacion;
  if (ev.estado === "firmada") {
    return { ok: false, error: "La evaluación ya está firmada." };
  }

  const { data: pac } = await supabase
    .from("pacientes")
    .select("nombres, apellidos, cedula, fecha_nacimiento, sexo")
    .eq("id", pacienteId)
    .single();
  if (!pac) return { ok: false, error: "No se encontró el paciente." };

  // Objeto sellado: contenido actual + datos de firma.
  const sellada: Evaluacion = {
    ...ev,
    firma_medico_nombre: parseo.data.firma_medico_nombre,
    paciente_acepto: parseo.data.paciente_acepto,
    paciente_nombre_firma: parseo.data.paciente_nombre_firma || null,
  };

  const hash = createHash("sha256").update(contenidoCanonico(sellada)).digest("hex");

  // Generar PDF editorial.
  let pdfPath: string | null = null;
  try {
    const bytes = await generarPdfEvaluacion({
      evaluacion: sellada,
      pacienteNombre: `${pac.nombres} ${pac.apellidos}`,
      pacienteCedula: pac.cedula,
      edad: calcularEdad(pac.fecha_nacimiento),
      sexo: pac.sexo ? ETIQUETA_SEXO[pac.sexo] : null,
      fechaTexto: formatearFecha(ev.fecha),
      firmaFechaTexto: formatearFechaHora(new Date()),
      hash,
    });
    const ruta = `${pacienteId}/${id}.pdf`;
    // Copia en un Buffer de Node con ArrayBuffer propio (evita el tipo
    // Uint8Array<ArrayBufferLike> que devuelve pdf-lib).
    const buffer = Buffer.from(bytes);
    const { error: errSubida } = await supabase.storage
      .from("evaluaciones")
      .upload(ruta, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (!errSubida) pdfPath = ruta;
  } catch {
    // Si el PDF falla, seguimos firmando con hash; el PDF se puede regenerar.
    pdfPath = null;
  }

  // UPDATE borrador → firmada (permitido; luego el trigger la sella).
  const { error } = await supabase
    .from("evaluaciones")
    .update({
      estado: "firmada",
      firmada_por: usuaria.id,
      firmada_en: new Date().toISOString(),
      firma_medico_nombre: parseo.data.firma_medico_nombre,
      paciente_acepto: parseo.data.paciente_acepto,
      paciente_nombre_firma: parseo.data.paciente_nombre_firma || null,
      hash_integridad: hash,
      pdf_path: pdfPath,
    } as never)
    .eq("id", id);

  if (error) {
    if (pdfPath) await supabase.storage.from("evaluaciones").remove([pdfPath]);
    return { ok: false, error: "No se pudo firmar la evaluación." };
  }

  await registrarAuditoria({
    actorId: usuaria.id,
    actorEmail: usuaria.email,
    accion: "firmar_evaluacion",
    entidad: "evaluaciones",
    entidadId: id,
    metadata: { paciente_id: pacienteId, hash },
  });

  revalidatePath(`/panel/pacientes/${pacienteId}`);
  revalidatePath(`/panel/pacientes/${pacienteId}/evaluaciones/${id}`);
  return { ok: true, id };
}
