import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export interface UsuariaActual {
  id: string;
  email: string;
  nombre_completo: string;
  rol: UserRole;
  activo: boolean;
}

/**
 * Devuelve la usuaria autenticada con su perfil, o null.
 * getUser() valida el token contra Supabase (no confía solo en la cookie).
 */
export async function obtenerUsuaria(): Promise<UsuariaActual | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: perfil } = await supabase
    .from("profiles")
    .select("nombre_completo, rol, activo")
    .eq("id", user.id)
    .single();

  if (!perfil) return null;

  return {
    id: user.id,
    email: user.email ?? "",
    nombre_completo: perfil.nombre_completo,
    rol: perfil.rol,
    activo: perfil.activo,
  };
}

/**
 * Exige sesión activa. Redirige a /login si no la hay o la cuenta está inactiva.
 * Usar al tope de páginas/handlers protegidos.
 */
export async function requerirUsuaria(): Promise<UsuariaActual> {
  const usuaria = await obtenerUsuaria();
  if (!usuaria || !usuaria.activo) {
    redirect("/login");
  }
  return usuaria;
}

/**
 * Exige uno de los roles indicados. Verificación 100% server-side.
 * Redirige al panel si el rol no está autorizado.
 */
export async function requerirRol(
  ...roles: UserRole[]
): Promise<UsuariaActual> {
  const usuaria = await requerirUsuaria();
  if (!roles.includes(usuaria.rol)) {
    redirect("/panel?acceso=denegado");
  }
  return usuaria;
}
