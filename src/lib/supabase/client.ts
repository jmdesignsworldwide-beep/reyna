"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Cliente de Supabase para el navegador.
 * Usa SOLO la anon key (pública y segura: RLS la contiene en el servidor).
 * Nunca importar aquí la service_role.
 */
export function createClient() {
  return createBrowserClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY,
  );
}
