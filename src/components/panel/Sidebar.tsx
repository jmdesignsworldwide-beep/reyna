"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NAVEGACION } from "@/lib/permissions";
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
  const [saliendo, setSaliendo] = useState(false);

  const items = NAVEGACION.filter((i) => i.roles.includes(rol));

  async function salir() {
    setSaliendo(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={`sticky top-0 z-20 flex h-screen flex-col border-r border-[var(--borde)] bg-[var(--superficie)] transition-all duration-300 ${
        colapsado ? "w-[76px]" : "w-64"
      }`}
    >
      {/* Encabezado */}
      <div className="flex items-center gap-3 border-b border-[var(--borde)] px-4 py-5">
        <HeartMark className="h-8 w-8 flex-none" />
        {!colapsado && (
          <div className="min-w-0 animate-fade-in">
            <p className="truncate font-display text-base font-semibold text-texto-principal">
              Dra. Reyna Massiel
            </p>
            <p className="truncate text-xs text-texto-secundario">
              Gestión clínica
            </p>
          </div>
        )}
      </div>

      {/* Navegación */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const activo =
            pathname === item.href ||
            (item.href !== "/panel" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              title={colapsado ? item.etiqueta : undefined}
              className={`group flex items-center gap-3 rounded-suave px-3 py-2.5 text-sm font-medium transition-all ${
                activo
                  ? "bg-[var(--tarjeta)] text-rosa-principal shadow-[inset_2px_0_0_var(--rosa-principal)]"
                  : "text-texto-secundario hover:bg-[var(--superficie-suave)] hover:text-rosa-principal"
              }`}
            >
              <span className="flex-none">
                <Icono nombre={item.icono} />
              </span>
              {!colapsado && <span className="truncate">{item.etiqueta}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Pie: usuaria + salir + colapsar */}
      <div className="space-y-2 border-t border-[var(--borde)] px-3 py-4">
        {!colapsado && (
          <div className="animate-fade-in rounded-suave bg-[var(--superficie-suave)] px-3 py-2.5">
            <p className="truncate text-sm font-medium text-texto-principal">
              {nombre}
            </p>
            <p className="text-xs text-rosa-medio">{ETIQUETAS_ROL[rol]}</p>
          </div>
        )}

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
          {!colapsado && <span>{saliendo ? "Saliendo…" : "Cerrar sesión"}</span>}
        </button>

        <button
          type="button"
          onClick={() => setColapsado((c) => !c)}
          aria-label={colapsado ? "Expandir menú" : "Colapsar menú"}
          className="flex w-full items-center justify-center rounded-suave border border-[var(--borde)] py-2 text-texto-secundario transition-colors hover:text-rosa-principal"
        >
          <span
            className={`transition-transform duration-300 ${colapsado ? "rotate-180" : ""}`}
          >
            ‹
          </span>
        </button>
      </div>
    </aside>
  );
}
