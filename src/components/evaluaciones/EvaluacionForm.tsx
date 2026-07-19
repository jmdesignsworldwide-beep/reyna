"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Alerta } from "@/components/ui/Alerta";
import { HeartMark } from "@/components/ui/HeartMark";
import { CampoFlotante, AreaFlotante, Segmentado } from "@/components/ui/campos";
import {
  crearEvaluacion,
  actualizarEvaluacion,
} from "@/app/panel/evaluaciones/acciones";
import {
  RIESGO_CV,
  EXPLORACION_CAMPOS,
  CONSENTIMIENTO_POR_DEFECTO,
} from "@/lib/evaluaciones";
import { clasificacionIMC } from "@/lib/cardio";
import type { Evaluacion, EstudioRevisado } from "@/types/database";

interface Prefill {
  factores_riesgo?: string;
  antecedentes?: string;
  antecedentes_familiares?: string;
  peso?: number | null;
  talla?: number | null;
  riesgo_cv?: Evaluacion["riesgo_cv"];
}

interface Props {
  pacienteId: string;
  paciente: { nombres: string; apellidos: string; alergias: string | null };
  estudiosDisponibles: EstudioRevisado[];
  modo?: "crear" | "editar";
  evaluacion?: Evaluacion;
  prefill?: Prefill;
}

function Seccion({
  i,
  titulo,
  descripcion,
  children,
}: {
  i: number;
  titulo: string;
  descripcion?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * i, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="tarjeta space-y-4 !p-5 sm:!p-6"
    >
      <div>
        <h2 className="font-display text-lg font-semibold text-texto-principal">{titulo}</h2>
        {descripcion && <p className="mt-0.5 text-sm text-texto-secundario">{descripcion}</p>}
      </div>
      {children}
    </motion.section>
  );
}

export function EvaluacionForm({
  pacienteId,
  paciente,
  estudiosDisponibles,
  modo = "crear",
  evaluacion,
  prefill,
}: Props) {
  const router = useRouter();
  const hoy = new Date();
  const claveHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
  const numStr = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));

  const e = evaluacion;
  const [fecha, setFecha] = useState(e?.fecha ?? claveHoy);
  const [motivo, setMotivo] = useState(e?.motivo ?? "");
  const [factores, setFactores] = useState(e?.factores_riesgo ?? prefill?.factores_riesgo ?? "");
  const [antecedentes, setAntecedentes] = useState(e?.antecedentes ?? prefill?.antecedentes ?? "");
  const [antFamiliares, setAntFamiliares] = useState(
    e?.antecedentes_familiares ?? prefill?.antecedentes_familiares ?? "",
  );

  const [taSis, setTaSis] = useState(numStr(e?.ta_sistolica));
  const [taDia, setTaDia] = useState(numStr(e?.ta_diastolica));
  const [fc, setFc] = useState(numStr(e?.frecuencia_cardiaca));
  const [peso, setPeso] = useState(numStr(e?.peso ?? prefill?.peso ?? null));
  const [talla, setTalla] = useState(numStr(e?.talla ?? prefill?.talla ?? null));

  const [ex, setEx] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    for (const c of EXPLORACION_CAMPOS) o[c.clave] = (e?.[c.clave] as string | null) ?? "";
    return o;
  });

  const [seleccionados, setSeleccionados] = useState<string[]>(
    e?.estudios_revisados?.map((s) => s.id) ?? [],
  );
  const [impresion, setImpresion] = useState(e?.impresion_diagnostica ?? "");
  const [recomendaciones, setRecomendaciones] = useState(e?.recomendaciones ?? "");
  const [riesgo, setRiesgo] = useState<string>(e?.riesgo_cv ?? prefill?.riesgo_cv ?? "");
  const [consentimiento, setConsentimiento] = useState(
    e?.consentimiento_texto ?? CONSENTIMIENTO_POR_DEFECTO,
  );

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imc = useMemo(() => {
    const p = Number(peso.replace(",", "."));
    const t = Number(talla.replace(",", "."));
    if (!Number.isFinite(p) || !Number.isFinite(t) || t <= 0 || p <= 0) return null;
    return Math.round((p / (t / 100) ** 2) * 10) / 10;
  }, [peso, talla]);
  const claseImc = clasificacionIMC(imc);

  function toggleEstudio(id: string) {
    setSeleccionados((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    setCargando(true);

    const estudios: EstudioRevisado[] = estudiosDisponibles.filter((s) =>
      seleccionados.includes(s.id),
    );

    const fd = new FormData();
    fd.set("fecha", fecha);
    fd.set("motivo", motivo);
    fd.set("factores_riesgo", factores);
    fd.set("antecedentes", antecedentes);
    fd.set("antecedentes_familiares", antFamiliares);
    fd.set("ta_sistolica", taSis);
    fd.set("ta_diastolica", taDia);
    fd.set("frecuencia_cardiaca", fc);
    fd.set("peso", peso);
    fd.set("talla", talla);
    for (const c of EXPLORACION_CAMPOS) fd.set(c.clave, ex[c.clave] ?? "");
    fd.set("estudios_revisados", JSON.stringify(estudios));
    fd.set("impresion_diagnostica", impresion);
    fd.set("recomendaciones", recomendaciones);
    fd.set("riesgo_cv", riesgo);
    fd.set("consentimiento_texto", consentimiento);

    const res =
      modo === "editar" && e
        ? await actualizarEvaluacion(e.id, pacienteId, fd)
        : await crearEvaluacion(pacienteId, fd);

    setCargando(false);
    if (!res.ok) {
      setError(res.error ?? "No se pudo guardar la evaluación.");
      return;
    }
    const destino = res.id
      ? `/panel/pacientes/${pacienteId}/evaluaciones/${res.id}`
      : `/panel/pacientes/${pacienteId}`;
    router.push(destino);
    router.refresh();
  }

  const tieneAlergia = (paciente.alergias ?? "").trim() !== "";

  return (
    <form onSubmit={enviar} className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="tarjeta !p-5"
      >
        <div className="flex items-center gap-2 text-sm text-rosa-medio">
          <HeartMark className="h-4 w-4" />
          <span>Evaluación de {paciente.nombres} {paciente.apellidos}</span>
        </div>
        {tieneAlergia && (
          <div
            role="alert"
            className="mt-3 flex items-start gap-2.5 rounded-suave border p-3"
            style={{ borderColor: "#E0567A", backgroundColor: "#E0567A14" }}
          >
            <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-estado-urgente text-[11px] font-bold text-white">
              !
            </span>
            <p className="text-sm text-texto-principal">
              <strong className="text-estado-urgente">Alergias:</strong> {paciente.alergias}
            </p>
          </div>
        )}
      </motion.div>

      <Seccion i={1} titulo="Datos de la evaluación">
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoFlotante label="Fecha" type="date" value={fecha} onChange={setFecha} required valido={fecha !== ""} />
        </div>
        <AreaFlotante label="Motivo de la evaluación / referimiento" value={motivo} onChange={setMotivo} rows={2} maxLength={1000} />
      </Seccion>

      <Seccion i={2} titulo="Antecedentes relevantes" descripcion="Autollenados de la ficha; edítalos para esta evaluación.">
        <AreaFlotante label="Factores de riesgo" value={factores} onChange={setFactores} rows={2} maxLength={2000} />
        <AreaFlotante label="Antecedentes personales" value={antecedentes} onChange={setAntecedentes} rows={3} maxLength={4000} />
        <AreaFlotante label="Antecedentes familiares" value={antFamiliares} onChange={setAntFamiliares} rows={2} maxLength={2000} />
      </Seccion>

      <Seccion i={3} titulo="Signos vitales y antropometría">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <CampoFlotante label="TA sistólica" value={taSis} onChange={setTaSis} inputMode="numeric" valido={taSis !== ""} />
          <CampoFlotante label="TA diastólica" value={taDia} onChange={setTaDia} inputMode="numeric" valido={taDia !== ""} />
          <CampoFlotante label="Frec. cardíaca" value={fc} onChange={setFc} inputMode="numeric" valido={fc !== ""} />
          <CampoFlotante label="Peso (kg)" value={peso} onChange={setPeso} inputMode="decimal" valido={peso !== ""} />
          <CampoFlotante label="Talla (cm)" value={talla} onChange={setTalla} inputMode="decimal" valido={talla !== ""} />
        </div>
        {imc !== null && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
            style={{
              backgroundColor: `${claseImc?.color ?? "#8A6B78"}1e`,
              color: claseImc?.color ?? "var(--texto-secundario)",
            }}
          >
            IMC {imc}{claseImc && ` · ${claseImc.etiqueta}`}
          </span>
        )}
      </Seccion>

      <Seccion i={4} titulo="Exploración cardiovascular">
        <div className="grid gap-4 sm:grid-cols-2">
          {EXPLORACION_CAMPOS.map((c) => (
            <AreaFlotante
              key={c.clave}
              label={c.etiqueta}
              value={ex[c.clave] ?? ""}
              onChange={(v) => setEx((o) => ({ ...o, [c.clave]: v }))}
              rows={2}
              maxLength={2000}
            />
          ))}
        </div>
      </Seccion>

      {estudiosDisponibles.length > 0 && (
        <Seccion i={5} titulo="Estudios revisados" descripcion="Marca los estudios que se revisaron en esta evaluación.">
          <div className="flex flex-wrap gap-2">
            {estudiosDisponibles.map((s) => {
              const activo = seleccionados.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleEstudio(s.id)}
                  className="rounded-full border px-3 py-1.5 text-sm transition-all"
                  style={{
                    borderColor: activo ? "var(--rosa-principal)" : "var(--borde)",
                    backgroundColor: activo ? "var(--rosa-pastel)" : "var(--superficie)",
                    color: activo ? "var(--rosa-principal)" : "var(--texto-secundario)",
                  }}
                >
                  {activo ? "✓ " : ""}
                  {s.tipo}
                  {s.fecha ? ` · ${s.fecha.split("-").reverse().join("/")}` : ""}
                </button>
              );
            })}
          </div>
        </Seccion>
      )}

      <Seccion i={6} titulo="Impresión diagnóstica y plan">
        <AreaFlotante label="Impresión diagnóstica" value={impresion} onChange={setImpresion} rows={3} maxLength={4000} />
        <AreaFlotante label="Recomendaciones y plan" value={recomendaciones} onChange={setRecomendaciones} rows={3} maxLength={4000} />
      </Seccion>

      <Seccion i={7} titulo="Estratificación de riesgo cardiovascular">
        <Segmentado
          label="Riesgo cardiovascular"
          value={riesgo}
          onChange={setRiesgo}
          opciones={RIESGO_CV.map((r) => ({ valor: r.valor, texto: r.texto }))}
        />
      </Seccion>

      <Seccion i={8} titulo="Consentimiento informado" descripcion="Texto que aparecerá en el documento firmado.">
        <AreaFlotante label="Texto del consentimiento" value={consentimiento} onChange={setConsentimiento} rows={5} maxLength={4000} />
      </Seccion>

      {error && <Alerta tono="urgente">{error}</Alerta>}

      <div className="sticky bottom-0 flex items-center gap-2 rounded-tarjeta border border-[var(--borde)] bg-[var(--fondo)]/90 p-3 backdrop-blur-md">
        <Button type="submit" cargando={cargando}>
          {modo === "editar" ? "Guardar cambios" : "Guardar borrador"}
        </Button>
        <Button
          type="button"
          variante="fantasma"
          onClick={() => router.push(`/panel/pacientes/${pacienteId}`)}
          className="ml-auto"
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
