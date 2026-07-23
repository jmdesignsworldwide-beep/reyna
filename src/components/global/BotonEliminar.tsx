"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Botón de eliminar con confirmación en línea. Recibe la acción ya ligada
 * (se define en el componente cliente que lo usa) y refresca al terminar.
 */
export function BotonEliminar({
  onEliminar,
  etiqueta = "Eliminar",
}: {
  onEliminar: () => Promise<{ ok: boolean; error?: string }>;
  etiqueta?: string;
}) {
  const router = useRouter();
  const [confirmar, setConfirmar] = useState(false);
  const [pendiente, start] = useTransition();

  function ejecutar() {
    start(async () => {
      const r = await onEliminar();
      if (r.ok) {
        setConfirmar(false);
        router.refresh();
      } else {
        setConfirmar(false);
        alert(r.error ?? "No se pudo eliminar.");
      }
    });
  }

  if (!confirmar) {
    return (
      <button
        onClick={() => setConfirmar(true)}
        className="rounded-suave border border-[var(--borde)] px-2.5 py-1.5 text-xs text-texto-secundario transition-colors hover:border-[#E0567A] hover:text-[#E0567A]"
      >
        {etiqueta}
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        onClick={ejecutar}
        disabled={pendiente}
        className="rounded-suave px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-60"
        style={{ background: "#E0567A" }}
      >
        {pendiente ? "Eliminando…" : "Confirmar"}
      </button>
      <button
        onClick={() => setConfirmar(false)}
        className="rounded-suave border border-[var(--borde)] px-2.5 py-1.5 text-xs text-texto-secundario"
      >
        Cancelar
      </button>
    </span>
  );
}
