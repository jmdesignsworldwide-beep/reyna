import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Intercambia el código del enlace de correo (recuperación / confirmación)
 * por una sesión válida y redirige al destino seguro dentro del propio sitio.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/panel";

  // Solo se permiten redirecciones internas (evita open redirect).
  const next = nextParam.startsWith("/") ? nextParam : "/panel";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=enlace_invalido`);
}
