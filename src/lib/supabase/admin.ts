import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Cliente ADMIN de Supabase — service_role.
 *
 * ⚠️  SOLO SERVIDOR. El import de "server-only" hace que el build FALLE
 * si este módulo se cuela en un bundle de cliente. La clave se lee de
 * process.env.SUPABASE_SERVICE_ROLE_KEY (sin prefijo NEXT_PUBLIC_), por lo
 * que jamás llega al navegador ni al repositorio.
 *
 * Ignora RLS: úsalo únicamente detrás de una verificación de rol server-side.
 */
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY. Debe existir SOLO en el servidor (.env.local / variables de Vercel).",
    );
  }

  return createSupabaseClient<Database>(env.SUPABASE_URL, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
