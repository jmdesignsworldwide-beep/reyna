import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Rate limiting server-side respaldado en Postgres (compartido entre
 * instancias serverless). Devuelve true si la petición está permitida.
 * Ante cualquier error de infraestructura, falla CERRADO (deniega).
 */
export async function limitarTasa(
  bucket: string,
  max: number,
  ventanaSegundos: number,
): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("enforce_rate_limit", {
      p_bucket: bucket,
      p_max: max,
      p_window_seconds: ventanaSegundos,
    });
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}

/**
 * Extrae una IP razonable de la petición para usarla como parte del bucket.
 */
export function ipDePeticion(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "desconocida";
}
