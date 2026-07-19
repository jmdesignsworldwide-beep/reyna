"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { eliminarEvaluacion } from "@/app/panel/evaluaciones/acciones";

export function AccionesEvaluacion({
  pacienteId,
  evaluacionId,
  estado,
  puedeEditar,
  puedeBorrar,
}: {
  pacienteId: string;
  evaluacionId: string;
  estado: "borrador" | "firmada";
  puedeEditar: boolean;
  puedeBorrar: boolean;
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Una evaluación firmada es inmutable: sin editar ni borrar.
  if (estado === "firmada") return null;

  async function borrar() {
    if (!window.confirm("¿Eliminar este borrador de evaluación? No se puede deshacer.")) return;
    setOcupado(true);
    setError(null);
    const res = await eliminarEvaluacion(evaluacionId, pacienteId);
    setOcupado(false);
    if (!res.ok) {
      setError(res.error ?? "No se pudo eliminar.");
      return;
    }
    router.push(`/panel/pacientes/${pacienteId}`);
    router.refresh();
  }

  if (!puedeEditar && !puedeBorrar) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {puedeEditar && (
        <Link
          href={`/panel/pacientes/${pacienteId}/evaluaciones/${evaluacionId}/editar`}
          className="rounded-suave border border-[var(--borde)] px-4 py-2.5 text-sm font-medium text-rosa-principal transition-colors hover:border-rosa-hover"
        >
          Editar borrador
        </Link>
      )}
      {puedeBorrar && (
        <button
          type="button"
          onClick={borrar}
          disabled={ocupado}
          className="rounded-suave border border-[var(--borde)] px-4 py-2.5 text-sm text-texto-secundario transition-colors hover:border-estado-urgente hover:text-estado-urgente disabled:opacity-60"
        >
          Eliminar
        </button>
      )}
      {error && <span className="text-sm text-estado-urgente">{error}</span>}
    </div>
  );
}
