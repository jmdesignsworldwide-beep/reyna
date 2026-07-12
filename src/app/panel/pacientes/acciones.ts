"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requerirUsuaria } from "@/lib/auth";
import { pacienteSchema, estudioSchema } from "@/lib/validaciones";
import { limitarTasa } from "@/lib/rate-limit";
import { registrarAuditoria } from "@/lib/audit";
import { puedeUI } from "@/lib/permissions";
import type { Medicamento } from "@/types/database";

export interface ResultadoAccion {
  ok: boolean;
  error?: string;
  id?: string;
}

const CAMPOS_TEXTO = [
  "nombres",
  "apellidos",
  "cedula",
  "fecha_nacimiento",
  "ocupacion",
  "telefono",
  "telefono_secundario",
  "correo",
  "direccion",
  "ciudad_sector",
  "ars",
  "numero_afiliado",
  "tipo_plan",
  "contacto_emergencia_nombre",
  "contacto_emergencia_parentesco",
  "contacto_emergencia_telefono",
  "rf_hipertension_desde",
  "rf_diabetes_desde",
  "rf_antecedentes_familiares_parentesco",
  "antecedentes_patologicos",
  "antecedentes_quirurgicos",
  "antecedentes_cardiovasculares",
  "tipo_sangre",
  "alergias",
  "referido_por",
  "notas",
] as const;

const CAMPOS_BOOL = [
  "rf_hipertension",
  "rf_dislipidemia",
  "rf_sedentarismo",
  "rf_antecedentes_familiares",
  "rf_enfermedad_renal",
] as const;

const CAMPOS_NUM = ["peso", "talla", "circunferencia_abdominal", "rf_tabaquismo_paquetes_ano"] as const;

function texto(fd: FormData, k: string): string {
  return (fd.get(k) as string | null)?.trim() ?? "";
}

function numero(fd: FormData, k: string): number | null {
  const v = texto(fd, k);
  if (v === "") return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function opcion(fd: FormData, k: string): string | null {
  const v = texto(fd, k);
  return v === "" ? null : v;
}

/** Construye el objeto a validar a partir del FormData del paciente. */
function extraerPaciente(fd: FormData) {
  const obj: Record<string, unknown> = {};
  for (const k of CAMPOS_TEXTO) obj[k] = texto(fd, k);
  for (const k of CAMPOS_BOOL) obj[k] = fd.get(k) === "true";
  for (const k of CAMPOS_NUM) obj[k] = numero(fd, k);

  obj.sexo = opcion(fd, "sexo");
  obj.estado_civil = opcion(fd, "estado_civil");
  obj.rf_diabetes = texto(fd, "rf_diabetes") || "no";
  obj.rf_tabaquismo = texto(fd, "rf_tabaquismo") || "nunca";

  // Medicación estructurada (JSON serializado en un input oculto).
  let medicacion: Medicamento[] = [];
  try {
    const raw = fd.get("medicacion");
    const arr = raw ? JSON.parse(raw as string) : [];
    if (Array.isArray(arr)) {
      medicacion = arr
        .map((m) => ({
          medicamento: String(m?.medicamento ?? "").trim(),
          dosis: String(m?.dosis ?? "").trim(),
          frecuencia: String(m?.frecuencia ?? "").trim(),
        }))
        .filter((m) => m.medicamento !== "");
    }
  } catch {
    medicacion = [];
  }
  obj.medicacion = medicacion;
  return obj;
}

/** Convierte las cadenas vacías a null para escribir en la base de datos. */
function aFila(datos: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(datos)) {
    out[k] = v === "" ? null : v;
  }
  return out;
}

export async function crearPaciente(formData: FormData): Promise<ResultadoAccion> {
  const usuaria = await requerirUsuaria();
  if (!puedeUI(usuaria.rol, "pacientes", "crear")) {
    return { ok: false, error: "No tienes permiso para registrar pacientes." };
  }

  const permitido = await limitarTasa(`crear-paciente:${usuaria.id}`, 60, 3600);
  if (!permitido) return { ok: false, error: "Demasiadas solicitudes. Intenta más tarde." };

  const parseo = pacienteSchema.safeParse(extraerPaciente(formData));
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pacientes")
    .insert({ ...aFila(parseo.data), created_by: usuaria.id } as never)
    .select("id")
    .single();

  if (error || !data) {
    const dup = error?.code === "23505";
    return { ok: false, error: dup ? "Ya existe un paciente con esa cédula." : "No se pudo registrar el paciente." };
  }

  await registrarAuditoria({
    actorId: usuaria.id,
    actorEmail: usuaria.email,
    accion: "crear_paciente",
    entidad: "pacientes",
    entidadId: data.id,
    metadata: { nombre: `${parseo.data.nombres} ${parseo.data.apellidos}` },
  });

  revalidatePath("/panel/pacientes");
  return { ok: true, id: data.id };
}

export async function actualizarPaciente(
  id: string,
  formData: FormData,
): Promise<ResultadoAccion> {
  const usuaria = await requerirUsuaria();
  if (!puedeUI(usuaria.rol, "pacientes", "editar")) {
    return { ok: false, error: "No tienes permiso para editar pacientes." };
  }

  const parseo = pacienteSchema.safeParse(extraerPaciente(formData));
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("pacientes")
    .update(aFila(parseo.data) as never)
    .eq("id", id);

  if (error) {
    const dup = error.code === "23505";
    return { ok: false, error: dup ? "Ya existe un paciente con esa cédula." : "No se pudo actualizar el paciente." };
  }

  await registrarAuditoria({
    actorId: usuaria.id,
    actorEmail: usuaria.email,
    accion: "actualizar_paciente",
    entidad: "pacientes",
    entidadId: id,
  });

  revalidatePath("/panel/pacientes");
  revalidatePath(`/panel/pacientes/${id}`);
  return { ok: true, id };
}

export async function alternarActivoPaciente(
  id: string,
  activo: boolean,
): Promise<ResultadoAccion> {
  const usuaria = await requerirUsuaria();
  if (!puedeUI(usuaria.rol, "pacientes", "editar")) {
    return { ok: false, error: "No tienes permiso para esta acción." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("pacientes").update({ activo } as never).eq("id", id);
  if (error) return { ok: false, error: "No se pudo actualizar el estado." };

  await registrarAuditoria({
    actorId: usuaria.id,
    actorEmail: usuaria.email,
    accion: activo ? "reactivar_paciente" : "archivar_paciente",
    entidad: "pacientes",
    entidadId: id,
  });

  revalidatePath("/panel/pacientes");
  revalidatePath(`/panel/pacientes/${id}`);
  return { ok: true };
}

// ============================================================
// Estudios cardiológicos
// ============================================================

const TIPOS_ARCHIVO = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_ARCHIVO = 15 * 1024 * 1024; // 15 MB

export async function crearEstudio(
  pacienteId: string,
  formData: FormData,
): Promise<ResultadoAccion> {
  const usuaria = await requerirUsuaria();
  if (!puedeUI(usuaria.rol, "estudios", "crear")) {
    return { ok: false, error: "No tienes permiso para registrar estudios." };
  }

  const permitido = await limitarTasa(`crear-estudio:${usuaria.id}`, 60, 3600);
  if (!permitido) return { ok: false, error: "Demasiadas solicitudes. Intenta más tarde." };

  const parseo = estudioSchema.safeParse({
    tipo: texto(formData, "tipo"),
    fecha_estudio: texto(formData, "fecha_estudio"),
    hallazgos: texto(formData, "hallazgos"),
    conclusion: texto(formData, "conclusion"),
    realizado_por: texto(formData, "realizado_por"),
  });
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();

  // Carga opcional de archivo (PDF o imagen) al bucket privado.
  let archivo_path: string | null = null;
  let archivo_nombre: string | null = null;
  const file = formData.get("archivo") as File | null;
  if (file && file.size > 0) {
    if (!TIPOS_ARCHIVO.includes(file.type)) {
      return { ok: false, error: "Formato no permitido. Usa PDF, JPG, PNG o WEBP." };
    }
    if (file.size > MAX_ARCHIVO) {
      return { ok: false, error: "El archivo supera el máximo de 15 MB." };
    }
    const limpio = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
    const ruta = `${pacienteId}/${crypto.randomUUID()}-${limpio}`;
    const { error: errSubida } = await supabase.storage
      .from("estudios")
      .upload(ruta, file, { contentType: file.type, upsert: false });
    if (errSubida) {
      return { ok: false, error: "No se pudo subir el archivo del estudio." };
    }
    archivo_path = ruta;
    archivo_nombre = file.name;
  }

  const { data, error } = await supabase
    .from("estudios_cardiologicos")
    .insert({
      paciente_id: pacienteId,
      tipo: parseo.data.tipo,
      fecha_estudio: parseo.data.fecha_estudio,
      hallazgos: parseo.data.hallazgos || null,
      conclusion: parseo.data.conclusion || null,
      realizado_por: parseo.data.realizado_por || null,
      archivo_path,
      archivo_nombre,
      created_by: usuaria.id,
    } as never)
    .select("id")
    .single();

  if (error || !data) {
    // Si falló el insert pero se subió el archivo, límpialo.
    if (archivo_path) await supabase.storage.from("estudios").remove([archivo_path]);
    return { ok: false, error: "No se pudo registrar el estudio." };
  }

  await registrarAuditoria({
    actorId: usuaria.id,
    actorEmail: usuaria.email,
    accion: "crear_estudio",
    entidad: "estudios_cardiologicos",
    entidadId: data.id,
    metadata: { paciente_id: pacienteId, tipo: parseo.data.tipo },
  });

  revalidatePath(`/panel/pacientes/${pacienteId}`);
  return { ok: true, id: data.id };
}

export async function eliminarEstudio(
  id: string,
  pacienteId: string,
): Promise<ResultadoAccion> {
  const usuaria = await requerirUsuaria();
  if (!puedeUI(usuaria.rol, "estudios", "borrar")) {
    return { ok: false, error: "No tienes permiso para eliminar estudios." };
  }

  const supabase = await createClient();

  // Recuperar la ruta del archivo para borrarlo del Storage.
  const { data: estudio } = await supabase
    .from("estudios_cardiologicos")
    .select("archivo_path")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("estudios_cardiologicos").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar el estudio." };

  if (estudio?.archivo_path) {
    await supabase.storage.from("estudios").remove([estudio.archivo_path]);
  }

  await registrarAuditoria({
    actorId: usuaria.id,
    actorEmail: usuaria.email,
    accion: "eliminar_estudio",
    entidad: "estudios_cardiologicos",
    entidadId: id,
    metadata: { paciente_id: pacienteId },
  });

  revalidatePath(`/panel/pacientes/${pacienteId}`);
  return { ok: true };
}
