"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alerta } from "@/components/ui/Alerta";
import { firmarEvaluacion } from "@/app/panel/evaluaciones/acciones";
import { formatearFechaHora } from "@/lib/formato";
import type { Evaluacion } from "@/types/database";

export function PanelFirma({
  evaluacion,
  esAdmin,
  pdfUrl,
  nombreMedicoSugerido,
}: {
  evaluacion: Evaluacion;
  esAdmin: boolean;
  pdfUrl: string | null;
  nombreMedicoSugerido: string;
}) {
  const router = useRouter();
  const e = evaluacion;

  const [firmaMedico, setFirmaMedico] = useState(nombreMedicoSugerido);
  const [pacienteAcepto, setPacienteAcepto] = useState(false);
  const [pacienteNombre, setPacienteNombre] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------- Ya firmada: sello + descarga ----------
  if (e.estado === "firmada") {
    return (
      <Card className="border-[rgba(76,175,130,0.4)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-estado-exito text-white">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <div>
              <p className="font-display text-lg font-semibold text-texto-principal">
                Documento firmado y sellado
              </p>
              <p className="text-sm text-texto-secundario">
                Firmado por {e.firma_medico_nombre ?? "el médico"}
                {e.firmada_en && ` · ${formatearFechaHora(e.firmada_en)}`}
              </p>
              {e.paciente_acepto && (
                <p className="text-sm text-texto-secundario">
                  Consentimiento aceptado por el paciente
                  {e.paciente_nombre_firma ? ` (${e.paciente_nombre_firma})` : ""}.
                </p>
              )}
            </div>
          </div>
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-suave bg-[linear-gradient(120deg,var(--rosa-principal),var(--rosa-medio))] px-4 py-2.5 text-sm font-medium text-white shadow-tarjeta transition-all hover:shadow-tarjeta-hover hover:brightness-105"
            >
              Descargar PDF ↗
            </a>
          )}
        </div>

        {e.hash_integridad && (
          <div className="mt-4 rounded-suave bg-[var(--superficie-suave)] p-3">
            <p className="text-xs uppercase tracking-wide text-texto-secundario">
              Sello de integridad (SHA-256)
            </p>
            <p className="mt-1 break-all font-mono text-xs text-texto-principal">
              {e.hash_integridad}
            </p>
            <p className="mt-1 text-xs text-texto-secundario">
              Este documento es inmutable: cualquier alteración invalidaría el sello.
            </p>
          </div>
        )}
      </Card>
    );
  }

  // ---------- Borrador ----------
  if (!esAdmin) {
    return (
      <Alerta tono="advertencia">
        Esta evaluación está en <strong>borrador</strong>. Solo el médico
        (administradora) puede firmarla y sellarla.
      </Alerta>
    );
  }

  async function firmar() {
    if (
      !window.confirm(
        "Al firmar, el documento se sella y NO se podrá modificar ni eliminar. ¿Continuar?",
      )
    )
      return;
    setError(null);
    setCargando(true);
    const fd = new FormData();
    fd.set("firma_medico_nombre", firmaMedico);
    fd.set("paciente_acepto", pacienteAcepto ? "true" : "false");
    fd.set("paciente_nombre_firma", pacienteNombre);
    const res = await firmarEvaluacion(e.id, e.paciente_id, fd);
    setCargando(false);
    if (!res.ok) {
      setError(res.error ?? "No se pudo firmar la evaluación.");
      return;
    }
    router.refresh();
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <h2 className="font-display text-lg font-semibold text-texto-principal">
          Firma y sellado
        </h2>
        <p className="mt-0.5 text-sm text-texto-secundario">
          Al firmar se genera el PDF, se calcula el sello de integridad y el
          documento queda inmutable.
        </p>

        {e.consentimiento_texto && (
          <div className="mt-4 rounded-suave border border-[var(--borde)] bg-[var(--superficie-suave)] p-4">
            <p className="text-xs uppercase tracking-wide text-texto-secundario">
              Consentimiento informado
            </p>
            <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-texto-principal">
              {e.consentimiento_texto}
            </p>
          </div>
        )}

        <label className="mt-4 flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={pacienteAcepto}
            onChange={(ev) => setPacienteAcepto(ev.target.checked)}
            className="mt-0.5 h-4 w-4 accent-rosa-principal"
          />
          <span className="text-sm text-texto-principal">
            El paciente fue informado y <strong>acepta</strong> el consentimiento.
          </span>
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm text-texto-secundario">
              Nombre del médico que firma <span className="text-estado-urgente">*</span>
            </label>
            <input
              value={firmaMedico}
              onChange={(ev) => setFirmaMedico(ev.target.value)}
              className="campo"
              maxLength={120}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-texto-secundario">
              Nombre del paciente que firma (opcional)
            </label>
            <input
              value={pacienteNombre}
              onChange={(ev) => setPacienteNombre(ev.target.value)}
              className="campo"
              maxLength={120}
              placeholder="Si el paciente firma físicamente"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4">
            <Alerta tono="urgente">{error}</Alerta>
          </div>
        )}

        <div className="mt-5">
          <Button onClick={firmar} cargando={cargando}>
            Firmar y sellar documento
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
