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

  async function accion() {
    const confirmar = activo
      ? "¿Archivar este paciente? Podrás reactivarlo después."
      : "¿Reactivar este paciente?";
    if (!window.confirm(confirmar)) return;
    setCargando(true);
    const res = await alternarActivoPaciente(id, !activo);
    setCargando(false);
    if (!res.ok) {
      window.alert(res.error ?? "No se pudo completar la acción.");
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={accion}
      disabled={cargando}
      className="rounded-suave border border-[var(--borde)] px-4 py-2.5 text-sm font-medium text-texto-secundario transition-colors hover:border-estado-advertencia hover:text-estado-advertencia disabled:opacity-60"
    >
      {cargando ? "…" : activo ? "Archivar" : "Reactivar"}
    </button>
  );
}
