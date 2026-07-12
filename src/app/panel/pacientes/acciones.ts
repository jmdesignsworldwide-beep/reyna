"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requerirUsuaria } from "@/lib/auth";
import { pacienteSchema } from "@/lib/validaciones";
import { limitarTasa } from "@/lib/rate-limit";
import { registrarAuditoria } from "@/lib/audit";
import { puedeUI } from "@/lib/permissions";

export interface ResultadoAccion {
  ok: boolean;
  error?: string;
  id?: string;
}

/**
 * Normaliza los campos opcionales vacíos a null antes de escribir en la BD.
 * La RLS (función `puede`) es la autoridad final; aquí se valida y audita.
 */
function limpiar(datos: Record<string, unknown>) {
  const salida: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(datos)) {
    salida[k] = v === "" || v === undefined ? null : v;
  }
  return salida;
}

function extraer(formData: FormData) {
  const campos = [
    "nombres",
    "apellidos",
    "cedula",
    "fecha_nacimiento",
    "sexo",
    "telefono",
    "correo",
    "direccion",
    "ars",
    "numero_afiliado",
    "tipo_sangre",
    "alergias",
    "antecedentes",
    "contacto_emergencia_nombre",
    "contacto_emergencia_telefono",
    "notas",
  ] as const;
  const obj: Record<string, string> = {};
  for (const c of campos) obj[c] = (formData.get(c) as string | null)?.trim() ?? "";
  return obj;
}

export async function crearPaciente(
  formData: FormData,
): Promise<ResultadoAccion> {
  const usuaria = await requerirUsuaria();
  if (!puedeUI(usuaria.rol, "pacientes", "crear")) {
    return { ok: false, error: "No tienes permiso para registrar pacientes." };
  }

  const permitido = await limitarTasa(`crear-paciente:${usuaria.id}`, 60, 3600);
  if (!permitido) {
    return { ok: false, error: "Demasiadas solicitudes. Intenta más tarde." };
  }

  const parseo = pacienteSchema.safeParse(extraer(formData));
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("pacientes")
    .insert({ ...limpiar(parseo.data), created_by: usuaria.id } as never)
    .select("id")
    .single();

  if (error || !data) {
    const dupCedula = error?.code === "23505";
    return {
      ok: false,
      error: dupCedula
        ? "Ya existe un paciente con esa cédula."
        : "No se pudo registrar el paciente.",
    };
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

  const parseo = pacienteSchema.safeParse(extraer(formData));
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("pacientes")
    .update(limpiar(parseo.data) as never)
    .eq("id", id);

  if (error) {
    const dupCedula = error.code === "23505";
    return {
      ok: false,
      error: dupCedula
        ? "Ya existe un paciente con esa cédula."
        : "No se pudo actualizar el paciente.",
    };
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

/** Archiva (soft-delete) o reactiva un paciente. Requiere permiso de edición. */
export async function alternarActivoPaciente(
  id: string,
  activo: boolean,
): Promise<ResultadoAccion> {
  const usuaria = await requerirUsuaria();
  if (!puedeUI(usuaria.rol, "pacientes", "editar")) {
    return { ok: false, error: "No tienes permiso para esta acción." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("pacientes")
    .update({ activo } as never)
    .eq("id", id);

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
