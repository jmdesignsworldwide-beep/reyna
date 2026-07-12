import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware raíz — corre en cada petición:
 *  1. Content-Security-Policy con nonce por petición (sin 'unsafe-inline' en scripts).
 *  2. Refresco de la sesión de Supabase (cookies).
 *  3. Protección de rutas: /panel exige sesión; /login redirige si ya hay sesión.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ---- 1. CSP con nonce (patrón oficial de Next.js) ----
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const supabaseOrigen = new URL(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://localhost",
  ).origin;
  const esDesarrollo = process.env.NODE_ENV !== "production";
  const scriptSrc = esDesarrollo
    ? `'self' 'nonce-${nonce}' 'unsafe-eval'`
    : `'self' 'nonce-${nonce}' 'strict-dynamic'`;

  const csp = [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: ${supabaseOrigen}`,
    `font-src 'self' data:`,
    `connect-src 'self' ${supabaseOrigen} https://*.supabase.co wss://*.supabase.co`,
    `frame-ancestors 'none'`,
    `form-action 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);

  // ---- 2. Sesión de Supabase ----
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request: { headers: requestHeaders } });
          response.headers.set("Content-Security-Policy", csp);
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() revalida el token contra Supabase (no confía en la cookie a ciegas).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ---- 3. Protección de rutas ----
  // Redirige preservando las cookies de sesión ya refrescadas por getUser().
  const redirigirA = (url: URL) => {
    const redir = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redir.cookies.set(c));
    redir.headers.set("Content-Security-Policy", csp);
    return redir;
  };

  const rutaProtegida = pathname === "/" || pathname.startsWith("/panel");

  if (rutaProtegida && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("redirigir", pathname);
    return redirigirA(url);
  }

  if (user && (pathname === "/login" || pathname === "/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/panel";
    url.search = "";
    return redirigirA(url);
  }

  return response;
}

export const config = {
  matcher: [
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
