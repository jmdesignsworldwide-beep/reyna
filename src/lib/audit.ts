import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

interface EntradaAuditoria {
  actorId: string | null;
  actorEmail: string | null;
  accion: string;
  entidad?: string;
  entidadId?: string;
  metadata?: { [key: string]: Json | undefined };
  ip?: string;
}

/**
 * Escribe una entrada en la bitácora de auditoría (audit_log).
 * Usa el cliente admin para garantizar el registro incluso cuando la
 * operación afecta a otra usuaria. Nunca lanza: la auditoría no debe
 * tumbar la acción principal, pero sí se registra en consola si falla.
 */
export async function registrarAuditoria(
  entrada: EntradaAuditoria,
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("audit_log").insert({
      actor_id: entrada.actorId,
      actor_email: entrada.actorEmail,
      accion: entrada.accion,
      entidad: entrada.entidad ?? null,
      entidad_id: entrada.entidadId ?? null,
      metadata: entrada.metadata ?? {},
      ip: entrada.ip ?? null,
    });
  } catch (e) {
    console.error("Fallo al registrar auditoría:", e);
  }
}
