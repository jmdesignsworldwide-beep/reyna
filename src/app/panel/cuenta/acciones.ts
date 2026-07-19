"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requerirUsuaria } from "@/lib/auth";
import { perfilSchema } from "@/lib/validaciones";
import { registrarAuditoria } from "@/lib/audit";

export interface ResultadoPerfil {
  ok: boolean;
  error?: string;
}

const UUID = /^[0-9a-f-]{36}$/i;

function texto(fd: FormData, k: string): string {
  return (fd.get(k) as string | null)?.trim() ?? "";
}

/**
 * Actualiza el perfil de la PROPIA usuaria (nombre y teléfono).
 * La RLS solo permite modificar la fila `id = auth.uid()`, y el trigger
 * `guard_admin_invariants` impide cambiar rol/estado — aquí ni se tocan.
 */
export async function actualizarMiPerfil(
  formData: FormData,
): Promise<ResultadoPerfil> {
  const usuaria = await requerirUsuaria();

  const parseo = perfilSchema.safeParse({
    nombre_completo: texto(formData, "nombre_completo"),
    telefono: texto(formData, "telefono"),
  });
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      nombre_completo: parseo.data.nombre_completo,
      telefono: parseo.data.telefono || null,
    })
    .eq("id", usuaria.id);

  if (error) return { ok: false, error: "No se pudo actualizar el perfil." };

  await registrarAuditoria({
    actorId: usuaria.id,
    actorEmail: usuaria.email,
    accion: "actualizar_mi_perfil",
    entidad: "profiles",
    entidadId: usuaria.id,
  });

  revalidatePath("/panel/cuenta");
  return { ok: true };
}

/** Guarda la sede preferida de la propia usuaria (o la limpia). */
export async function guardarSedePreferida(
  sedeId: string | null,
): Promise<ResultadoPerfil> {
  const usuaria = await requerirUsuaria();
  const valor = sedeId && UUID.test(sedeId) ? sedeId : null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ sede_preferida: valor })
    .eq("id", usuaria.id);

  if (error) return { ok: false, error: "No se pudo guardar la preferencia." };

  revalidatePath("/panel/cuenta");
  revalidatePath("/panel/agenda");
  return { ok: true };
}
