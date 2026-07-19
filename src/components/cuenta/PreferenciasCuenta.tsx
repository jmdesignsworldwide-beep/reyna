"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTema } from "@/components/theme/ThemeProvider";
import { guardarSedePreferida } from "@/app/panel/cuenta/acciones";
import type { Sede } from "@/types/database";

export function PreferenciasCuenta({
  sedes,
  sedePreferidaInicial,
  mostrarSede,
}: {
  sedes: Sede[];
  sedePreferidaInicial: string | null;
  mostrarSede: boolean;
}) {
  const router = useRouter();
  const { tema, alternar } = useTema();
  const [sede, setSede] = useState(sedePreferidaInicial ?? "");
  const [guardado, setGuardado] = useState(false);

  function elegirTema(v: "claro" | "oscuro") {
    if (v !== tema) alternar();
  }

  async function cambiarSede(v: string) {
    setSede(v);
    const res = await guardarSedePreferida(v || null);
    if (res.ok) {
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2000);
      router.refresh();
    }
  }

  return (
    <div className="space-y-5">
      {/* Tema */}
      <div>
        <p className="mb-1.5 text-sm text-texto-secundario">Apariencia</p>
        <div className="flex gap-1.5 rounded-suave border border-[var(--borde)] bg-[var(--superficie-suave)] p-1">
          {([
            { v: "claro", t: "☀️ Claro" },
            { v: "oscuro", t: "🌙 Oscuro" },
          ] as const).map((o) => {
            const activo = tema === o.v;
            return (
              <button
                key={o.v}
                type="button"
                onClick={() => elegirTema(o.v)}
                className={`flex-1 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors ${
                  activo
                    ? "bg-[linear-gradient(120deg,var(--rosa-principal),var(--rosa-medio))] text-white"
                    : "text-texto-secundario hover:text-rosa-principal"
                }`}
              >
                {o.t}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sede por defecto */}
      {mostrarSede && (
        <div>
          <p className="mb-1.5 text-sm text-texto-secundario">
            Sede por defecto{" "}
            {guardado && <span className="text-estado-exito">· guardada ✓</span>}
          </p>
          <select
            value={sede}
            onChange={(e) => cambiarSede(e.target.value)}
            className="campo"
          >
            <option value="">Sin preferencia</option>
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-texto-secundario">
            Al agendar una cita, esta sede vendrá preseleccionada.
          </p>
        </div>
      )}
    </div>
  );
}
