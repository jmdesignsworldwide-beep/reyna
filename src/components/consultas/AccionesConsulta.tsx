"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { eliminarConsulta } from "@/app/panel/consultas/acciones";

export function AccionesConsulta({
  pacienteId,
  consultaId,
  puedeEditar,
  puedeBorrar,
}: {
  pacienteId: string;
  consultaId: string;
  puedeEditar: boolean;
  puedeBorrar: boolean;
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function borrar() {
    if (!window.confirm("¿Eliminar esta consulta? No se puede deshacer.")) return;
    setOcupado(true);
    setError(null);
    const res = await eliminarConsulta(consultaId, pacienteId);
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
          href={`/panel/pacientes/${pacienteId}/consultas/${consultaId}/editar`}
          className="rounded-suave bg-[linear-gradient(120deg,var(--rosa-principal),var(--rosa-medio))] px-4 py-2.5 text-sm font-medium text-white shadow-tarjeta transition-all hover:shadow-tarjeta-hover hover:brightness-105"
        >
          Editar
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
