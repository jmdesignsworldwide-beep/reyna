import { NextResponse, type NextRequest } from "next/server";
import { requerirApi } from "@/lib/api-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { actualizarUsuariaSchema } from "@/lib/validaciones";
import { ipDePeticion } from "@/lib/rate-limit";
import { registrarAuditoria } from "@/lib/audit";

export const runtime = "nodejs";

/**
 * PATCH /api/admin/usuarias/[id] — Cambia rol o estado (activo) de una cuenta.
 * DELETE /api/admin/usuarias/[id] — Elimina una cuenta.
 * Solo administradoras. La protección del último admin la garantiza el
 * trigger de base de datos (guard_admin_invariants); aquí damos un mensaje claro.
 */

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await requerirApi("admin");
  if (!guard.ok) return guard.respuesta;

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const parseo = actualizarUsuariaSchema.safeParse(cuerpo);
  if (!parseo.success) {
    return NextResponse.json(
      { error: parseo.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update(parseo.data)
    .eq("id", id);

  if (error) {
    // El trigger devuelve estos códigos al proteger al último admin.
    const esProteccion =
      error.code === "23514" ||
      error.message.toLowerCase().includes("último administrador");
    return NextResponse.json(
      {
        error: esProteccion
          ? "No se puede degradar ni desactivar al último administrador activo."
          : "No se pudo actualizar la cuenta.",
      },
      { status: esProteccion ? 409 : 500 },
    );
  }

  await registrarAuditoria({
    actorId: guard.usuaria.id,
    actorEmail: guard.usuaria.email,
    accion: "actualizar_usuaria",
    entidad: "profiles",
    entidadId: id,
    metadata: { ...parseo.data },
    ip: ipDePeticion(request),
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await requerirApi("admin");
  if (!guard.ok) return guard.respuesta;

  // No permitir auto-eliminación (defensa adicional de UX).
  if (id === guard.usuaria.id) {
    return NextResponse.json(
      { error: "No puedes eliminar tu propia cuenta." },
      { status: 409 },
    );
  }

  const admin = createAdminClient();

  // El borrado en Auth cascadea a profiles y dispara el trigger que
  // protege al último administrador activo.
  const { error } = await admin.auth.admin.deleteUser(id);

  if (error) {
    const esProteccion = error.message
      .toLowerCase()
      .includes("último administrador");
    return NextResponse.json(
      {
        error: esProteccion
          ? "No se puede eliminar al último administrador activo."
          : "No se pudo eliminar la cuenta.",
      },
      { status: esProteccion ? 409 : 500 },
    );
  }

  await registrarAuditoria({
    actorId: guard.usuaria.id,
    actorEmail: guard.usuaria.email,
    accion: "eliminar_usuaria",
    entidad: "profiles",
    entidadId: id,
    ip: ipDePeticion(request),
  });

  return NextResponse.json({ ok: true });
}
