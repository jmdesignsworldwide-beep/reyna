"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requerirUsuaria } from "@/lib/auth";
import { consultaSchema } from "@/lib/validaciones";
import { limitarTasa } from "@/lib/rate-limit";
import { registrarAuditoria } from "@/lib/audit";
import { puedeUI } from "@/lib/permissions";
import type { Diagnostico, ItemPrescripcion } from "@/types/database";

export interface ResultadoConsulta {
  ok: boolean;
  error?: string;
  id?: string;
}

function texto(fd: FormData, k: string): string {
  return (fd.get(k) as string | null)?.trim() ?? "";
}

function numero(fd: FormData, k: string): number | null {
  const v = texto(fd, k);
  if (v === "") return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Construye el objeto a validar a partir del FormData de la consulta. */
function extraerConsulta(fd: FormData) {
  let diagnosticos: Diagnostico[] = [];
  try {
    const arr = JSON.parse((fd.get("diagnosticos") as string) || "[]");
    if (Array.isArray(arr)) {
      diagnosticos = arr
        .map((d) => ({
          diagnostico: String(d?.diagnostico ?? "").trim(),
          cie10: String(d?.cie10 ?? "").trim(),
        }))
        .filter((d) => d.diagnostico !== "");
    }
  } catch {
    diagnosticos = [];
  }

  let prescripcion: ItemPrescripcion[] = [];
  try {
    const arr = JSON.parse((fd.get("prescripcion") as string) || "[]");
    if (Array.isArray(arr)) {
      prescripcion = arr
        .map((m) => ({
          medicamento: String(m?.medicamento ?? "").trim(),
          dosis: String(m?.dosis ?? "").trim(),
          frecuencia: String(m?.frecuencia ?? "").trim(),
          duracion: String(m?.duracion ?? "").trim(),
        }))
        .filter((m) => m.medicamento !== "");
    }
  } catch {
    prescripcion = [];
  }

  return {
    tipo: texto(fd, "tipo") || "seguimiento",
    fecha: texto(fd, "fecha"),
    motivo: texto(fd, "motivo"),
    ta_sistolica: numero(fd, "ta_sistolica"),
    ta_diastolica: numero(fd, "ta_diastolica"),
    frecuencia_cardiaca: numero(fd, "frecuencia_cardiaca"),
    frecuencia_respiratoria: numero(fd, "frecuencia_respiratoria"),
    spo2: numero(fd, "spo2"),
    temperatura: numero(fd, "temperatura"),
    peso: numero(fd, "peso"),
    talla: numero(fd, "talla"),
    exploracion_fisica: texto(fd, "exploracion_fisica"),
    diagnosticos,
    plan_conducta: texto(fd, "plan_conducta"),
    prescripcion,
    proxima_reevaluacion: texto(fd, "proxima_reevaluacion"),
    notas_evolucion: texto(fd, "notas_evolucion"),
  };
}

/** Cadenas vacías → null para la base de datos. */
function aFila(datos: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(datos)) out[k] = v === "" ? null : v;
  return out;
}

const UUID = /^[0-9a-f-]{36}$/i;

export async function crearConsulta(
  pacienteId: string,
  formData: FormData,
  citaId?: string,
): Promise<ResultadoConsulta> {
  const usuaria = await requerirUsuaria();
  if (!puedeUI(usuaria.rol, "consultas", "crear")) {
    return { ok: false, error: "No tienes permiso para registrar consultas." };
  }
  if (!UUID.test(pacienteId)) return { ok: false, error: "Paciente inválido." };

  const permitido = await limitarTasa(`crear-consulta:${usuaria.id}`, 120, 3600);
  if (!permitido) return { ok: false, error: "Demasiadas solicitudes. Intenta más tarde." };

  const parseo = consultaSchema.safeParse(extraerConsulta(formData));
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const cita = citaId && UUID.test(citaId) ? citaId : null;

  const { data, error } = await supabase
    .from("consultas")
    .insert({
      ...aFila(parseo.data),
      paciente_id: pacienteId,
      cita_id: cita,
      created_by: usuaria.id,
    } as never)
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: "No se pudo registrar la consulta." };
  }

  // Si nace de una cita de agenda, marcarla como atendida (revalidado por RLS).
  if (cita && puedeUI(usuaria.rol, "agenda", "editar")) {
    await supabase.from("citas").update({ estado: "atendida" } as never).eq("id", cita);
  }

  await registrarAuditoria({
    actorId: usuaria.id,
    actorEmail: usuaria.email,
    accion: "crear_consulta",
    entidad: "consultas",
    entidadId: data.id,
    metadata: { paciente_id: pacienteId, tipo: parseo.data.tipo, cita_id: cita },
  });

  revalidatePath(`/panel/pacientes/${pacienteId}`);
  if (cita) revalidatePath("/panel/agenda");
  return { ok: true, id: data.id };
}

export async function actualizarConsulta(
  id: string,
  pacienteId: string,
  formData: FormData,
): Promise<ResultadoConsulta> {
  const usuaria = await requerirUsuaria();
  if (!puedeUI(usuaria.rol, "consultas", "editar")) {
    return { ok: false, error: "No tienes permiso para editar consultas." };
  }
  if (!UUID.test(id)) return { ok: false, error: "Consulta inválida." };

  const parseo = consultaSchema.safeParse(extraerConsulta(formData));
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("consultas")
    .update(aFila(parseo.data) as never)
    .eq("id", id);

  if (error) return { ok: false, error: "No se pudo actualizar la consulta." };

  await registrarAuditoria({
    actorId: usuaria.id,
    actorEmail: usuaria.email,
    accion: "actualizar_consulta",
    entidad: "consultas",
    entidadId: id,
    metadata: { paciente_id: pacienteId },
  });

  revalidatePath(`/panel/pacientes/${pacienteId}`);
  revalidatePath(`/panel/pacientes/${pacienteId}/consultas/${id}`);
  return { ok: true, id };
}

export async function eliminarConsulta(
  id: string,
  pacienteId: string,
): Promise<ResultadoConsulta> {
  const usuaria = await requerirUsuaria();
  if (!puedeUI(usuaria.rol, "consultas", "borrar")) {
    return { ok: false, error: "No tienes permiso para eliminar consultas." };
  }
  if (!UUID.test(id)) return { ok: false, error: "Consulta inválida." };

  const supabase = await createClient();
  const { error } = await supabase.from("consultas").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar la consulta." };

  await registrarAuditoria({
    actorId: usuaria.id,
    actorEmail: usuaria.email,
    accion: "eliminar_consulta",
    entidad: "consultas",
    entidadId: id,
    metadata: { paciente_id: pacienteId },
  });

  revalidatePath(`/panel/pacientes/${pacienteId}`);
  return { ok: true };
}
