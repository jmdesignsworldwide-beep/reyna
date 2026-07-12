/**
 * Acceso a variables de entorno con validación PEREZOSA.
 *
 * La validación ocurre al LEER cada variable (en tiempo de ejecución), no al
 * cargar el módulo. Así el `next build` no depende de secretos (buena práctica
 * y necesario para que Vercel construya previews antes de configurar el
 * entorno), pero en runtime sigue fallando seguro y claro si algo falta.
 *
 * La service_role NUNCA se lee aquí (esto se importa en cliente y servidor);
 * se lee exclusivamente en src/lib/supabase/admin.ts (solo servidor).
 */

function requerido(nombre: string, valor: string | undefined): string {
  if (!valor || valor.trim() === "") {
    throw new Error(
      `Falta la variable de entorno ${nombre}. Revisa tu .env.local (usa .env.example como guía).`,
    );
  }
  return valor;
}

export const env = {
  get SUPABASE_URL(): string {
    return requerido(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    );
  },
  get SUPABASE_ANON_KEY(): string {
    return requerido(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  },
  get SITE_URL(): string {
    return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  },
};
