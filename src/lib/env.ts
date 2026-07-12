/**
 * Validación de variables de entorno.
 * Falla temprano y claro si falta algo, para no arrancar con configuración rota.
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
  SUPABASE_URL: requerido(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ),
  SUPABASE_ANON_KEY: requerido(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ),
  SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};
