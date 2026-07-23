"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { alternarActivoPaciente } from "@/app/panel/pacientes/acciones";

export function BotonArchivar({
  id,
  activo,
}: {
  id: string;
  activo: boolean;
}) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accion() {
    setCargando(true);
    setError(null);
    const res = await alternarActivoPaciente(id, !activo);
    setCargando(false);
    if (!res.ok) {
      setConfirmar(false);
      setError(res.error ?? "No se pudo completar la acción.");
      return;
    }
    router.refresh();
  }

  if (confirmar) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="hidden text-sm text-texto-secundario sm:inline">
          {activo ? "¿Archivar?" : "¿Reactivar?"}
        </span>
        <button
          type="button"
          onClick={accion}
          disabled={cargando}
          className="rounded-suave border border-estado-advertencia px-4 py-2.5 text-sm font-medium text-estado-advertencia transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {cargando ? "…" : "Confirmar"}
        </button>
        <button
          type="button"
          onClick={() => setConfirmar(false)}
          className="rounded-suave border border-[var(--borde)] px-4 py-2.5 text-sm text-texto-secundario"
        >
          Cancelar
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      {error && <span className="text-xs text-estado-urgente">{error}</span>}
      <button
        type="button"
        onClick={() => setConfirmar(true)}
        className="rounded-suave border border-[var(--borde)] px-4 py-2.5 text-sm font-medium text-texto-secundario transition-colors active:scale-[0.98] hover:border-estado-advertencia hover:text-estado-advertencia"
      >
        {activo ? "Archivar" : "Reactivar"}
      </button>
    </span>
  );
}
