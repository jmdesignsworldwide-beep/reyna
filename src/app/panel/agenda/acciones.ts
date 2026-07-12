"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requerirUsuaria } from "@/lib/auth";
import { citaSchema, estadoCitaSchema } from "@/lib/validaciones";
import { limitarTasa } from "@/lib/rate-limit";
import { registrarAuditoria } from "@/lib/audit";
import { puedeUI } from "@/lib/permissions";
import { sumarMinutos, fechaDesdeClave } from "@/lib/agenda";

export interface ResultadoCita {
  ok: boolean;
  error?: string;
  id?: string;
}

function extraer(fd: FormData) {
  return {
    paciente_id: (fd.get("paciente_id") as string | null)?.trim() ?? "",
    sede_id: (fd.get("sede_id") as string | null)?.trim() ?? "",
    fecha: (fd.get("fecha") as string | null)?.trim() ?? "",
    hora_inicio: (fd.get("hora_inicio") as string | null)?.trim() ?? "",
    duracion: (fd.get("duracion") as string | null)?.trim() ?? "30",
    tipo: (fd.get("tipo") as string | null)?.trim() ?? "",
    motivo: (fd.get("motivo") as string | null)?.trim() ?? "",
    notas: (fd.get("notas") as string | null)?.trim() ?? "",
  };
}

/**
 * Valida que [inicio, fin) caiga dentro del horario de la sede para ese día,
 * y que la doctora no tenga otra cita solapada (en cualquier sede).
 * Devuelve un mensaje de error, o null si todo bien.
 */
async function validarDisponibilidad(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sedeId: string,
  fecha: string,
  inicio: string,
  fin: string,
  excluirCitaId?: string,
): Promise<string | null> {
  const dia = fechaDesdeClave(fecha).getDay(); // 0=domingo … 6=sábado

  const { data: horario } = await supabase
    .from("sede_horarios")
    .select("hora_inicio, hora_fin")
    .eq("sede_id", sedeId)
    .eq("dia_semana", dia)
    .maybeSingle();

  if (!horario) {
    return "La sede no atiende ese día. Revisa el horario de la sede.";
  }
  // Comparación lexicográfica de "HH:MM" funciona por ser cero-rellenada.
  const hi = horario.hora_inicio.slice(0, 5);
  const hf = horario.hora_fin.slice(0, 5);
  if (inicio < hi || fin > hf) {
    return `Fuera del horario de atención (${hi}–${hf} ese día).`;
  }

  // Solape con cualquier cita no cancelada de la doctora (una sola agenda).
  let q = supabase
    .from("citas")
    .select("id, sede_id, hora_inicio, hora_fin")
    .eq("fecha", fecha)
    .neq("estado", "cancelada")
    .lt("hora_inicio", `${fin}:00`)
    .gt("hora_fin", `${inicio}:00`);
  if (excluirCitaId) q = q.neq("id", excluirCitaId);

  const { data: solapadas } = await q;
  if (solapadas && solapadas.length > 0) {
    const otra = solapadas[0]!;
    return otra.sede_id === sedeId
      ? "Ya existe una cita en ese horario en esta sede."
      : "La doctora ya tiene una cita en ese horario en otra sede.";
  }
  return null;
}

export async function crearCita(formData: FormData): Promise<ResultadoCita> {
  const usuaria = await requerirUsuaria();
  if (!puedeUI(usuaria.rol, "agenda", "crear")) {
    return { ok: false, error: "No tienes permiso para agendar citas." };
  }

  const permitido = await limitarTasa(`crear-cita:${usuaria.id}`, 120, 3600);
  if (!permitido) return { ok: false, error: "Demasiadas solicitudes. Intenta más tarde." };

  const parseo = citaSchema.safeParse(extraer(formData));
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const d = parseo.data;
  const hora_fin = sumarMinutos(d.hora_inicio, d.duracion);

  const supabase = await createClient();
  const err = await validarDisponibilidad(supabase, d.sede_id, d.fecha, d.hora_inicio, hora_fin);
  if (err) return { ok: false, error: err };

  const { data, error } = await supabase
    .from("citas")
    .insert({
      paciente_id: d.paciente_id,
      sede_id: d.sede_id,
      fecha: d.fecha,
      hora_inicio: `${d.hora_inicio}:00`,
      hora_fin: `${hora_fin}:00`,
      tipo: d.tipo,
      motivo: d.motivo || null,
      notas: d.notas || null,
      created_by: usuaria.id,
    } as never)
    .select("id")
    .single();

  if (error || !data) {
    // 23P01 = exclusion_violation → choque de horario detectado por la BD.
    const choque = error?.code === "23P01";
    return {
      ok: false,
      error: choque
        ? "Ese horario acaba de ocuparse en esta sede. Elige otro."
        : "No se pudo agendar la cita.",
    };
  }

  await registrarAuditoria({
    actorId: usuaria.id,
    actorEmail: usuaria.email,
    accion: "crear_cita",
    entidad: "citas",
    entidadId: data.id,
    metadata: { fecha: d.fecha, hora: d.hora_inicio, tipo: d.tipo },
  });

  revalidatePath("/panel/agenda");
  return { ok: true, id: data.id };
}

export async function actualizarCita(
  id: string,
  formData: FormData,
): Promise<ResultadoCita> {
  const usuaria = await requerirUsuaria();
  if (!puedeUI(usuaria.rol, "agenda", "editar")) {
    return { ok: false, error: "No tienes permiso para editar citas." };
  }

  const parseo = citaSchema.safeParse(extraer(formData));
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const d = parseo.data;
  const hora_fin = sumarMinutos(d.hora_inicio, d.duracion);

  const supabase = await createClient();
  const err = await validarDisponibilidad(supabase, d.sede_id, d.fecha, d.hora_inicio, hora_fin, id);
  if (err) return { ok: false, error: err };

  const { error } = await supabase
    .from("citas")
    .update({
      paciente_id: d.paciente_id,
      sede_id: d.sede_id,
      fecha: d.fecha,
      hora_inicio: `${d.hora_inicio}:00`,
      hora_fin: `${hora_fin}:00`,
      tipo: d.tipo,
      motivo: d.motivo || null,
      notas: d.notas || null,
    } as never)
    .eq("id", id);

  if (error) {
    const choque = error.code === "23P01";
    return { ok: false, error: choque ? "Ese horario ya está ocupado en esta sede." : "No se pudo actualizar la cita." };
  }

  await registrarAuditoria({
    actorId: usuaria.id,
    actorEmail: usuaria.email,
    accion: "actualizar_cita",
    entidad: "citas",
    entidadId: id,
  });

  revalidatePath("/panel/agenda");
  return { ok: true, id };
}

export async function cambiarEstadoCita(
  id: string,
  estado: string,
): Promise<ResultadoCita> {
  const usuaria = await requerirUsuaria();
  if (!puedeUI(usuaria.rol, "agenda", "editar")) {
    return { ok: false, error: "No tienes permiso para cambiar el estado." };
  }

  const parseo = estadoCitaSchema.safeParse({ estado });
  if (!parseo.success) return { ok: false, error: "Estado inválido." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("citas")
    .update({ estado: parseo.data.estado } as never)
    .eq("id", id);

  if (error) return { ok: false, error: "No se pudo actualizar el estado." };

  await registrarAuditoria({
    actorId: usuaria.id,
    actorEmail: usuaria.email,
    accion: "cambiar_estado_cita",
    entidad: "citas",
    entidadId: id,
    metadata: { estado: parseo.data.estado },
  });

  revalidatePath("/panel/agenda");
  return { ok: true, id };
}

export async function eliminarCita(id: string): Promise<ResultadoCita> {
  const usuaria = await requerirUsuaria();
  if (!puedeUI(usuaria.rol, "agenda", "borrar")) {
    return { ok: false, error: "No tienes permiso para eliminar citas." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("citas").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar la cita." };

  await registrarAuditoria({
    actorId: usuaria.id,
    actorEmail: usuaria.email,
    accion: "eliminar_cita",
    entidad: "citas",
    entidadId: id,
  });

  revalidatePath("/panel/agenda");
  return { ok: true };
}
