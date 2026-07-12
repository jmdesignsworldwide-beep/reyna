import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Cliente de Supabase para Server Components / Route Handlers.
 * Mantiene la sesión sincronizada mediante cookies. Usa la anon key:
 * respeta RLS con la identidad de la usuaria autenticada.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Invocado desde un Server Component: las cookies se refrescan
            // en el middleware. Se puede ignorar con seguridad.
          }
        },
      },
    },
  );
}
