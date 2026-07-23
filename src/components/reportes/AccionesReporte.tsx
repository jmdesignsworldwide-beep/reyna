"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { eliminarReporte } from "@/app/panel/pacientes/[id]/reportes/acciones";
import { enlaceWhatsApp } from "@/lib/reportes";

export function AccionesReporte({
  reporteId,
  pacienteId,
  pdfUrl,
  telefono,
  resumen,
  puedeBorrar,
}: {
  reporteId: string;
  pacienteId: string;
  pdfUrl: string | null;
  telefono: string | null;
  resumen: string | null;
  puedeBorrar: boolean;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [confirmar, setConfirmar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const waUrl = resumen ? enlaceWhatsApp(telefono, resumen) : null;

  function borrar() {
    setError(null);
    startTransition(async () => {
      const r = await eliminarReporte(reporteId, pacienteId);
      if (r.ok) router.refresh();
      else {
        setConfirmar(false);
        setError(r.error ?? "No se pudo eliminar el reporte.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {error && <span className="w-full text-xs text-estado-urgente">{error}</span>}
      {pdfUrl ? (
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-suave border border-[var(--borde)] px-3 py-1.5 text-xs font-medium text-rosa-principal transition-colors hover:border-rosa-hover"
        >
          Descargar PDF ↗
        </a>
      ) : (
        <span
          className="cursor-not-allowed rounded-suave border border-[var(--borde)] px-3 py-1.5 text-xs font-medium text-texto-secundario opacity-60"
          title="El PDF no está disponible; regenera el reporte."
        >
          PDF no disponible
        </span>
      )}

      {waUrl ? (
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-suave px-3 py-1.5 text-xs font-medium text-white transition-all hover:brightness-105"
          style={{ background: "#25D366" }}
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
            <path d="M17.5 14.4c-.3-.15-1.7-.84-2-.94-.26-.1-.45-.15-.64.15-.19.29-.74.94-.9 1.13-.17.2-.33.22-.62.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.29-.02-.45.13-.6.13-.13.3-.34.44-.51.15-.17.2-.29.3-.49.1-.2.05-.37-.02-.51-.08-.15-.64-1.55-.88-2.12-.23-.55-.47-.48-.64-.49h-.55c-.19 0-.5.07-.76.36-.26.29-1 .98-1 2.38s1.02 2.76 1.17 2.95c.15.2 2.01 3.07 4.87 4.3.68.3 1.21.47 1.63.6.68.22 1.3.19 1.79.11.55-.08 1.7-.69 1.94-1.36.24-.67.24-1.24.17-1.36-.07-.12-.26-.19-.55-.34zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z" />
          </svg>
          WhatsApp
        </a>
      ) : (
        <span
          className="cursor-not-allowed rounded-suave border border-[var(--borde)] px-3 py-1.5 text-xs font-medium text-texto-secundario opacity-60"
          title={telefono ? "Falta el resumen del reporte." : "El paciente no tiene teléfono válido."}
        >
          WhatsApp
        </span>
      )}

      {puedeBorrar &&
        (confirmar ? (
          <span className="inline-flex items-center gap-1.5">
            <button
              onClick={borrar}
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
        ) : (
          <button
            onClick={() => setConfirmar(true)}
            className="rounded-suave border border-[var(--borde)] px-2.5 py-1.5 text-xs text-texto-secundario transition-colors hover:border-[#E0567A] hover:text-[#E0567A]"
          >
            Eliminar
          </button>
        ))}
    </div>
  );
}
