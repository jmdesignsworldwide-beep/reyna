import { NextResponse, type NextRequest } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requerirApi } from "@/lib/api-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { cambiarClaveSchema } from "@/lib/validaciones";
import { limitarTasa, ipDePeticion } from "@/lib/rate-limit";
import { registrarAuditoria } from "@/lib/audit";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/**
 * POST /api/cuenta/clave — Cambia la contraseña de la usuaria autenticada.
 * Verifica la contraseña ACTUAL server-side antes de aplicar el cambio.
 * Disponible para todos los roles. Rate limited. Auditado.
 */
export async function POST(request: NextRequest) {
  const guard = await requerirApi();
  if (!guard.ok) return guard.respuesta;

  const permitido = await limitarTasa(`cambiar-clave:${guard.usuaria.id}`, 5, 900);
  if (!permitido) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera unos minutos." },
      { status: 429 },
    );
  }

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const parseo = cambiarClaveSchema.safeParse(cuerpo);
  if (!parseo.success) {
    return NextResponse.json(
      { error: parseo.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 },
    );
  }

  // Verificar la contraseña actual con un cliente efímero (no toca la sesión).
  const verificador = createSupabaseClient(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error: errorVerif } = await verificador.auth.signInWithPassword({
    email: guard.usuaria.email,
    password: parseo.data.clave_actual,
  });

  if (errorVerif) {
    return NextResponse.json(
      { error: "La contraseña actual no es correcta." },
      { status: 400 },
    );
  }

  // Aplicar la nueva contraseña vía admin.
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(guard.usuaria.id, {
    password: parseo.data.clave_nueva,
  });

  if (error) {
    return NextResponse.json(
      { error: "No se pudo actualizar la contraseña." },
      { status: 500 },
    );
  }

  await registrarAuditoria({
    actorId: guard.usuaria.id,
    actorEmail: guard.usuaria.email,
    accion: "cambiar_clave",
    entidad: "auth.users",
    entidadId: guard.usuaria.id,
    ip: ipDePeticion(request),
  });

  return NextResponse.json({ ok: true });
}
