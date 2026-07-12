import { NextResponse, type NextRequest } from "next/server";
import { requerirApi } from "@/lib/api-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { crearUsuariaSchema } from "@/lib/validaciones";
import { limitarTasa, ipDePeticion } from "@/lib/rate-limit";
import { registrarAuditoria } from "@/lib/audit";

export const runtime = "nodejs";

/**
 * POST /api/admin/usuarias — Crea una cuenta con rol asignado.
 * Solo administradoras. Rate limited. Auditado.
 */
export async function POST(request: NextRequest) {
  const guard = await requerirApi("admin");
  if (!guard.ok) return guard.respuesta;

  const ip = ipDePeticion(request);
  const permitido = await limitarTasa(`crear-usuaria:${guard.usuaria.id}`, 10, 3600);
  if (!permitido) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta más tarde." },
      { status: 429 },
    );
  }

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const parseo = crearUsuariaSchema.safeParse(cuerpo);
  if (!parseo.success) {
    return NextResponse.json(
      { error: parseo.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 },
    );
  }
  const datos = parseo.data;

  const admin = createAdminClient();

  // Crear en Auth con metadata; el trigger handle_new_user crea el perfil.
  const { data: creada, error } = await admin.auth.admin.createUser({
    email: datos.correo,
    password: datos.clave,
    email_confirm: true,
    user_metadata: {
      nombre_completo: datos.nombre_completo,
      cedula: datos.cedula || null,
      telefono: datos.telefono || null,
      rol: datos.rol,
    },
  });

  if (error || !creada.user) {
    const yaExiste = error?.message?.toLowerCase().includes("already");
    return NextResponse.json(
      {
        error: yaExiste
          ? "Ya existe una cuenta con ese correo."
          : "No se pudo crear la cuenta.",
      },
      { status: yaExiste ? 409 : 500 },
    );
  }

  // Asegurar el rol correcto (por si el trigger aplicó el valor por defecto).
  await admin
    .from("profiles")
    .update({
      rol: datos.rol,
      cedula: datos.cedula || null,
      telefono: datos.telefono || null,
      nombre_completo: datos.nombre_completo,
    })
    .eq("id", creada.user.id);

  await registrarAuditoria({
    actorId: guard.usuaria.id,
    actorEmail: guard.usuaria.email,
    accion: "crear_usuaria",
    entidad: "profiles",
    entidadId: creada.user.id,
    metadata: { correo: datos.correo, rol: datos.rol },
    ip,
  });

  return NextResponse.json(
    { ok: true, id: creada.user.id },
    { status: 201 },
  );
}
