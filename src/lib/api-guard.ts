import "server-only";

import { NextResponse } from "next/server";
import { obtenerUsuaria, type UsuariaActual } from "@/lib/auth";
import type { UserRole } from "@/types/database";

type ResultadoGuard =
  | { ok: true; usuaria: UsuariaActual }
  | { ok: false; respuesta: NextResponse };

/**
 * Guardia server-side para route handlers: exige sesión activa y (opcional)
 * uno de los roles indicados. Devuelve la usuaria o una respuesta 401/403.
 */
export async function requerirApi(
  ...roles: UserRole[]
): Promise<ResultadoGuard> {
  const usuaria = await obtenerUsuaria();

  if (!usuaria || !usuaria.activo) {
    return {
      ok: false,
      respuesta: NextResponse.json(
        { error: "No autenticada." },
        { status: 401 },
      ),
    };
  }

  if (roles.length > 0 && !roles.includes(usuaria.rol)) {
    return {
      ok: false,
      respuesta: NextResponse.json(
        { error: "No tienes permiso para esta acción." },
        { status: 403 },
      ),
    };
  }

  return { ok: true, usuaria };
}
