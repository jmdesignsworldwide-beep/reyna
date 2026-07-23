"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NAVEGACION, SECCIONES_NAV } from "@/lib/permissions";
import { ETIQUETAS_ROL } from "@/lib/permissions";
import { HeartMark } from "@/components/ui/HeartMark";
import { Icono } from "@/components/panel/iconos";
import type { UserRole } from "@/types/database";

export function Sidebar({
  rol,
  nombre,
}: {
  rol: UserRole;
  nombre: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [colapsado, setColapsado] = useState(false);
  const [abierto, setAbierto] = useState(false); // drawer móvil
  const [saliendo, setSaliendo] = useState(false);

  const items = NAVEGACION.filter((i) => i.roles.includes(rol));

  // Cierra el drawer al navegar en móvil.
  useEffect(() => {
    setAbierto(false);
  }, [pathname]);

  // Evita el scroll de fondo cuando el drawer está abierto en móvil.
  useEffect(() => {
    if (abierto) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [abierto]);

  async function salir() {
    setSaliendo(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const oculto = (compacto: boolean) => (compacto ? "md:hidden" : "");

  return (
    <>
      {/* Botón hamburguesa (solo móvil) */}
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Abrir menú"
        className="fixed left-3 top-2.5 z-30 flex h-10 w-10 items-center justify-center rounded-suave border border-[var(--borde)] bg-[var(--superficie)]/90 text-texto-secundario backdrop-blur transition-colors hover:text-rosa-principal md:hidden"
      >
        <Icono nombre="menu" />
      </button>

      {/* Backdrop (solo móvil) */}
      {abierto && (
        <div
          onClick={() => setAbierto(false)}
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen flex-col border-r border-[var(--borde)] bg-[var(--superficie)] transition-transform duration-300 md:sticky md:top-0 md:z-20 md:translate-x-0 md:transition-all ${
          abierto ? "translate-x-0" : "-translate-x-full"
        } w-72 ${colapsado ? "md:w-[76px]" : "md:w-64"}`}
      >
        {/* Encabezado */}
        <div className="flex items-center gap-3 border-b border-[var(--borde)] px-4 py-5">
          <HeartMark className="h-8 w-8 flex-none" />
          <div className={`min-w-0 ${oculto(colapsado)}`}>
            <p className="truncate font-display text-base font-semibold text-texto-principal">
              Dra. Reyna Massiel
            </p>
            <p className="truncate text-xs text-texto-secundario">Gestión clínica</p>
          </div>
          {/* Cerrar (solo móvil) */}
          <button
            type="button"
            onClick={() => setAbierto(false)}
            aria-label="Cerrar menú"
            className="ml-auto text-texto-secundario transition-colors hover:text-rosa-principal md:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {/* Navegación por secciones */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {SECCIONES_NAV.map((seccion, si) => {
            const deSeccion = items.filter((i) => i.seccion === seccion.clave);
            if (deSeccion.length === 0) return null;
            return (
              <div
                key={seccion.clave}
                className={
                  seccion.clave === "config"
                    ? "mt-4 border-t border-[var(--borde)] pt-4"
                    : si === 0
                      ? ""
                      : "mt-4"
                }
              >
                <p
                  className={`px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-texto-secundario/70 ${oculto(colapsado)}`}
                >
                  {seccion.etiqueta}
                </p>
                <div className="space-y-1">
                  {deSeccion.map((item) => {
                    const activo =
                      pathname === item.href ||
                      (item.href !== "/panel" && pathname.startsWith(item.href));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setAbierto(false)}
                        title={colapsado ? item.etiqueta : undefined}
                        className={`group flex items-center gap-3 rounded-suave px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.98] ${
                          activo
                            ? "bg-[var(--tarjeta)] text-rosa-principal shadow-[inset_2px_0_0_var(--rosa-principal)]"
                            : "text-texto-secundario hover:bg-[var(--superficie-suave)] hover:text-rosa-principal"
                        }`}
                      >
                        <span className="flex-none">
                          <Icono nombre={item.icono} />
                        </span>
                        <span className={`truncate ${oculto(colapsado)}`}>{item.etiqueta}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Pie: usuaria + salir + colapsar */}
        <div className="space-y-2 border-t border-[var(--borde)] px-3 py-4">
          <div className={`rounded-suave bg-[var(--superficie-suave)] px-3 py-2.5 ${oculto(colapsado)}`}>
            <p className="truncate text-sm font-medium text-texto-principal">{nombre}</p>
            <p className="text-xs text-rosa-medio">{ETIQUETAS_ROL[rol]}</p>
          </div>

          <button
            type="button"
            onClick={salir}
            disabled={saliendo}
            title="Cerrar sesión"
            className="flex w-full items-center gap-3 rounded-suave px-3 py-2.5 text-sm font-medium text-texto-secundario transition-colors hover:bg-[var(--superficie-suave)] hover:text-estado-urgente disabled:opacity-60"
          >
            <span className="flex-none">
              <Icono nombre="salir" />
            </span>
            <span className={oculto(colapsado)}>{saliendo ? "Saliendo…" : "Cerrar sesión"}</span>
          </button>

          {/* Colapsar: solo escritorio */}
          <button
            type="button"
            onClick={() => setColapsado((c) => !c)}
            aria-label={colapsado ? "Expandir menú" : "Colapsar menú"}
            className="hidden w-full items-center justify-center rounded-suave border border-[var(--borde)] py-2 text-texto-secundario transition-colors hover:text-rosa-principal md:flex"
          >
            <span className={`transition-transform duration-300 ${colapsado ? "rotate-180" : ""}`}>
              ‹
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
