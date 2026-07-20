"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { HeartMark } from "@/components/ui/HeartMark";
import { generarReporte } from "@/app/panel/pacientes/[id]/reportes/acciones";
import {
  ETIQUETA_TIPO_REPORTE,
  DESCRIPCION_TIPO_REPORTE,
  construirMensaje,
  snapConsulta,
  snapEstudio,
  snapGeneral,
  normalizarTelefonoRD,
  type ContenidoReporte,
} from "@/lib/reportes";
import { calcularEdad, formatearFecha } from "@/lib/formato";
import { ETIQUETA_SEXO, ETIQUETA_TIPO_ESTUDIO } from "@/lib/cardio";
import { ETIQUETA_TIPO_CONSULTA } from "@/lib/consultas";
import type { Paciente, Consulta, Estudio, TipoReporte } from "@/types/database";

const TIPOS: TipoReporte[] = ["resumen_consulta", "resultado_estudio", "reporte_general"];

export function GeneradorReporte({
  paciente,
  consultas,
  estudios,
}: {
  paciente: Paciente;
  consultas: Consulta[];
  estudios: Estudio[];
}) {
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoReporte | null>(null);
  const [consultaId, setConsultaId] = useState<string>("");
  const [estudioId, setEstudioId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  const pacienteSnap = useMemo(
    () => ({
      nombre: `${paciente.nombres} ${paciente.apellidos}`,
      cedula: paciente.cedula,
      edad: calcularEdad(paciente.fecha_nacimiento),
      sexo: paciente.sexo ? ETIQUETA_SEXO[paciente.sexo] : null,
    }),
    [paciente],
  );

  const telWa = normalizarTelefonoRD(paciente.telefono);

  const { contenido, mensaje, listo } = useMemo(() => {
    if (!tipo) return { contenido: null, mensaje: "", listo: false };
    const c: ContenidoReporte = { paciente: pacienteSnap };
    let fechaTexto = formatearFecha(new Date());
    let ok = false;
    if (tipo === "resumen_consulta") {
      const co = consultas.find((x) => x.id === consultaId);
      if (co) {
        c.consulta = snapConsulta(co);
        fechaTexto = c.consulta.fecha;
        ok = true;
      }
    } else if (tipo === "resultado_estudio") {
      const e = estudios.find((x) => x.id === estudioId);
      if (e) {
        c.estudio = snapEstudio(e);
        fechaTexto = c.estudio.fecha;
        ok = true;
      }
    } else {
      c.general = snapGeneral(paciente, consultas.slice(0, 5));
      ok = true;
    }
    return { contenido: c, mensaje: ok ? construirMensaje(tipo, c, fechaTexto) : "", listo: ok };
  }, [tipo, consultaId, estudioId, consultas, estudios, paciente, pacienteSnap]);

  function generar() {
    if (!tipo || !listo) return;
    setError(null);
    const fd = new FormData();
    fd.set("tipo", tipo);
    if (tipo === "resumen_consulta") fd.set("consulta_id", consultaId);
    if (tipo === "resultado_estudio") fd.set("estudio_id", estudioId);
    startTransition(async () => {
      const r = await generarReporte(paciente.id, fd);
      if (r.ok) {
        router.push(`/panel/pacientes/${paciente.id}#reportes`);
        router.refresh();
      } else {
        setError(r.error ?? "No se pudo generar el reporte.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <header className="animate-fade-up">
        <Link
          href={`/panel/pacientes/${paciente.id}#reportes`}
          className="text-sm text-texto-secundario hover:text-rosa-principal"
        >
          ← {pacienteSnap.nombre}
        </Link>
        <div className="mt-2 flex items-center gap-2 text-sm text-rosa-medio">
          <HeartMark className="h-4 w-4" />
          <span>Reportes</span>
        </div>
        <h1 className="mt-1 font-display text-3xl font-semibold text-texto-principal">
          Generar reporte
        </h1>
        <p className="mt-1 text-texto-secundario">Elige qué documento quieres crear para el paciente.</p>
      </header>

      {/* Paso 1 · Tipo */}
      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold text-texto-principal">1 · Tipo de reporte</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {TIPOS.map((t) => {
            const activo = tipo === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTipo(t);
                  setError(null);
                }}
                className="rounded-tarjeta border p-4 text-left transition-all hover:-translate-y-0.5"
                style={{
                  borderColor: activo ? "var(--rosa-principal)" : "var(--borde)",
                  background: activo ? "var(--superficie-suave)" : "transparent",
                  boxShadow: activo ? "0 8px 24px -12px rgba(177,74,115,0.5)" : "none",
                }}
              >
                <p className="font-medium text-texto-principal">{ETIQUETA_TIPO_REPORTE[t]}</p>
                <p className="mt-1 text-xs leading-relaxed text-texto-secundario">
                  {DESCRIPCION_TIPO_REPORTE[t]}
                </p>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Paso 2 · Fuente */}
      <AnimatePresence>
        {tipo === "resumen_consulta" && (
          <PasoSelector titulo="2 · Consulta">
            {consultas.length === 0 ? (
              <Vacio texto="Este paciente aún no tiene consultas registradas." />
            ) : (
              <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {consultas.map((c) => (
                  <OpcionSelector
                    key={c.id}
                    activo={consultaId === c.id}
                    onClick={() => setConsultaId(c.id)}
                    titulo={`${formatearFecha(c.fecha)} · ${ETIQUETA_TIPO_CONSULTA[c.tipo]}`}
                    detalle={c.motivo ?? c.diagnosticos.map((d) => d.diagnostico).join("; ") ?? null}
                  />
                ))}
              </ul>
            )}
          </PasoSelector>
        )}
        {tipo === "resultado_estudio" && (
          <PasoSelector titulo="2 · Estudio">
            {estudios.length === 0 ? (
              <Vacio texto="Este paciente aún no tiene estudios registrados." />
            ) : (
              <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {estudios.map((e) => (
                  <OpcionSelector
                    key={e.id}
                    activo={estudioId === e.id}
                    onClick={() => setEstudioId(e.id)}
                    titulo={`${ETIQUETA_TIPO_ESTUDIO[e.tipo]} · ${formatearFecha(e.fecha_estudio)}`}
                    detalle={e.conclusion ?? e.hallazgos ?? null}
                  />
                ))}
              </ul>
            )}
          </PasoSelector>
        )}
      </AnimatePresence>

      {/* Paso 3 · Vista previa */}
      {listo && contenido && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <h2 className="mb-1 font-display text-lg font-semibold text-texto-principal">
              3 · Vista previa
            </h2>
            <p className="mb-4 text-sm text-texto-secundario">
              Así llegará el mensaje por WhatsApp. El PDF con membrete se genera aparte.
            </p>
            <div className="rounded-tarjeta border border-[var(--borde)] bg-[var(--superficie-suave)] p-4">
              <div className="mx-auto max-w-md rounded-2xl rounded-tl-sm bg-[#dcf8c6] p-3.5 text-sm leading-relaxed text-[#1f2d1a] shadow-sm">
                <p className="whitespace-pre-line">{mensaje}</p>
              </div>
            </div>

            {!telWa && (
              <p className="mt-3 flex items-center gap-2 text-sm" style={{ color: "#E8A13C" }}>
                <span aria-hidden>⚠</span>
                El paciente no tiene un teléfono válido en su ficha. Podrás descargar el PDF, pero no
                enviar por WhatsApp hasta registrar su número.
              </p>
            )}

            {error && (
              <p className="mt-3 rounded-suave border px-3 py-2 text-sm" style={{ borderColor: "#E0567A66", background: "#E0567A14", color: "#E0567A" }}>
                {error}
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={generar}
                disabled={pendiente}
                className="rounded-suave bg-[linear-gradient(120deg,var(--rosa-principal),var(--rosa-medio))] px-5 py-2.5 text-sm font-medium text-white shadow-tarjeta transition-all hover:shadow-tarjeta-hover hover:brightness-105 disabled:opacity-60"
              >
                {pendiente ? "Generando…" : "Generar reporte"}
              </button>
              <Link
                href={`/panel/pacientes/${paciente.id}#reportes`}
                className="rounded-suave border border-[var(--borde)] px-5 py-2.5 text-sm font-medium text-texto-secundario transition-colors hover:border-rosa-hover hover:text-rosa-principal"
              >
                Cancelar
              </Link>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

function PasoSelector({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold text-texto-principal">{titulo}</h2>
        {children}
      </Card>
    </motion.div>
  );
}

function OpcionSelector({
  activo,
  onClick,
  titulo,
  detalle,
}: {
  activo: boolean;
  onClick: () => void;
  titulo: string;
  detalle: string | null;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="w-full rounded-suave border p-3 text-left transition-all hover:border-rosa-hover"
        style={{
          borderColor: activo ? "var(--rosa-principal)" : "var(--borde)",
          background: activo ? "var(--superficie-suave)" : "transparent",
        }}
      >
        <p className="font-medium text-texto-principal">{titulo}</p>
        {detalle && <p className="line-clamp-1 text-sm text-texto-secundario">{detalle}</p>}
      </button>
    </li>
  );
}

function Vacio({ texto }: { texto: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <HeartMark className="h-7 w-7 opacity-60" />
      <p className="text-sm text-texto-secundario">{texto}</p>
    </div>
  );
}
