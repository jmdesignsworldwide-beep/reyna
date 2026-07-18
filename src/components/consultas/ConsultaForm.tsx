"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Alerta } from "@/components/ui/Alerta";
import { HeartMark } from "@/components/ui/HeartMark";
import { CampoFlotante, AreaFlotante, Segmentado } from "@/components/ui/campos";
import { crearConsulta, actualizarConsulta } from "@/app/panel/consultas/acciones";
import { TIPOS_CONSULTA_CLINICA, clasificacionTA } from "@/lib/consultas";
import { clasificacionIMC } from "@/lib/cardio";
import type {
  Consulta,
  Diagnostico,
  ItemPrescripcion,
} from "@/types/database";

interface Props {
  pacienteId: string;
  paciente: { nombres: string; apellidos: string; alergias: string | null };
  factores: string[];
  citaId?: string;
  modo?: "crear" | "editar";
  consulta?: Consulta;
  pesoInicial?: number | null;
  tallaInicial?: number | null;
}

function seccionVariants(i: number) {
  return {
    initial: { opacity: 0, y: 14 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { delay: 0.05 * i, duration: 0.35, ease: [0.22, 1, 0.36, 1] },
    },
  };
}

function Seccion({
  indice,
  titulo,
  descripcion,
  children,
}: {
  indice: number;
  titulo: string;
  descripcion?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      variants={seccionVariants(indice)}
      initial="initial"
      animate="animate"
      className="tarjeta space-y-4 !p-5 sm:!p-6"
    >
      <div>
        <h2 className="font-display text-lg font-semibold text-texto-principal">
          {titulo}
        </h2>
        {descripcion && (
          <p className="mt-0.5 text-sm text-texto-secundario">{descripcion}</p>
        )}
      </div>
      {children}
    </motion.section>
  );
}

export function ConsultaForm({
  pacienteId,
  paciente,
  factores,
  citaId,
  modo = "crear",
  consulta,
  pesoInicial,
  tallaInicial,
}: Props) {
  const router = useRouter();
  const hoy = new Date();
  const claveHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;

  const [fecha, setFecha] = useState(consulta?.fecha ?? claveHoy);
  const [tipo, setTipo] = useState<string>(consulta?.tipo ?? "seguimiento");
  const [motivo, setMotivo] = useState(consulta?.motivo ?? "");

  const numStr = (n: number | null | undefined) =>
    n === null || n === undefined ? "" : String(n);

  const [taSis, setTaSis] = useState(numStr(consulta?.ta_sistolica));
  const [taDia, setTaDia] = useState(numStr(consulta?.ta_diastolica));
  const [fc, setFc] = useState(numStr(consulta?.frecuencia_cardiaca));
  const [fr, setFr] = useState(numStr(consulta?.frecuencia_respiratoria));
  const [spo2, setSpo2] = useState(numStr(consulta?.spo2));
  const [temp, setTemp] = useState(numStr(consulta?.temperatura));
  const [peso, setPeso] = useState(
    numStr(consulta?.peso ?? pesoInicial ?? null),
  );
  const [talla, setTalla] = useState(
    numStr(consulta?.talla ?? tallaInicial ?? null),
  );

  const [exploracion, setExploracion] = useState(consulta?.exploracion_fisica ?? "");
  const [plan, setPlan] = useState(consulta?.plan_conducta ?? "");
  const [reevaluacion, setReevaluacion] = useState(consulta?.proxima_reevaluacion ?? "");
  const [evolucion, setEvolucion] = useState(consulta?.notas_evolucion ?? "");

  const [dx, setDx] = useState<Diagnostico[]>(
    consulta?.diagnosticos?.length ? consulta.diagnosticos : [],
  );
  const [rx, setRx] = useState<ItemPrescripcion[]>(
    consulta?.prescripcion?.length ? consulta.prescripcion : [],
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

  const ta = clasificacionTA(
    taSis ? Number(taSis) : null,
    taDia ? Number(taDia) : null,
  );

  function nuevoDx() {
    setDx((d) => [...d, { diagnostico: "", cie10: "" }]);
  }
  function nuevoRx() {
    setRx((r) => [...r, { medicamento: "", dosis: "", frecuencia: "", duracion: "" }]);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const fd = new FormData();
    fd.set("fecha", fecha);
    fd.set("tipo", tipo);
    fd.set("motivo", motivo);
    fd.set("ta_sistolica", taSis);
    fd.set("ta_diastolica", taDia);
    fd.set("frecuencia_cardiaca", fc);
    fd.set("frecuencia_respiratoria", fr);
    fd.set("spo2", spo2);
    fd.set("temperatura", temp);
    fd.set("peso", peso);
    fd.set("talla", talla);
    fd.set("exploracion_fisica", exploracion);
    fd.set("plan_conducta", plan);
    fd.set("proxima_reevaluacion", reevaluacion);
    fd.set("notas_evolucion", evolucion);
    fd.set(
      "diagnosticos",
      JSON.stringify(dx.filter((d) => d.diagnostico.trim() !== "")),
    );
    fd.set(
      "prescripcion",
      JSON.stringify(rx.filter((r) => r.medicamento.trim() !== "")),
    );

    const res =
      modo === "editar" && consulta
        ? await actualizarConsulta(consulta.id, pacienteId, fd)
        : await crearConsulta(pacienteId, fd, citaId);

    setCargando(false);
    if (!res.ok) {
      setError(res.error ?? "No se pudo guardar la consulta.");
      return;
    }
    const destino = res.id
      ? `/panel/pacientes/${pacienteId}/consultas/${res.id}`
      : `/panel/pacientes/${pacienteId}`;
    router.push(destino);
    router.refresh();
  }

  const tieneAlergia = (paciente.alergias ?? "").trim() !== "";

  return (
    <form onSubmit={enviar} className="space-y-4">
      {/* Contexto clínico del paciente (siempre visible) */}
      <motion.div
        variants={seccionVariants(0)}
        initial="initial"
        animate="animate"
        className="tarjeta !p-5"
      >
        <div className="flex items-center gap-2 text-sm text-rosa-medio">
          <HeartMark className="h-4 w-4" />
          <span>Consulta de {paciente.nombres} {paciente.apellidos}</span>
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
              <strong className="text-estado-urgente">Alergias:</strong>{" "}
              {paciente.alergias}
            </p>
          </div>
        )}
        {factores.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {factores.map((f) => (
              <span
                key={f}
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
                style={{ borderColor: "#E8A13C66", backgroundColor: "#E8A13C14" }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-estado-advertencia" />
                {f}
              </span>
            ))}
          </div>
        )}
      </motion.div>

      {/* Datos de la consulta */}
      <Seccion indice={1} titulo="Datos de la consulta">
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoFlotante
            label="Fecha de consulta"
            type="date"
            value={fecha}
            onChange={setFecha}
            required
            valido={fecha !== ""}
          />
          <div className="sm:col-span-2">
            <Segmentado
              label="Tipo de consulta"
              value={tipo}
              onChange={setTipo}
              opciones={TIPOS_CONSULTA_CLINICA.map((t) => ({
                valor: t.valor,
                texto: t.texto,
              }))}
            />
          </div>
          <div className="sm:col-span-2">
            <AreaFlotante
              label="Motivo de consulta"
              value={motivo}
              onChange={setMotivo}
              rows={2}
              maxLength={300}
            />
          </div>
        </div>
      </Seccion>

      {/* Signos vitales */}
      <Seccion
        indice={2}
        titulo="Signos vitales"
        descripcion="El IMC se calcula automáticamente con peso y talla."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <CampoFlotante label="TA sistólica" value={taSis} onChange={setTaSis} inputMode="numeric" valido={taSis !== ""} />
          <CampoFlotante label="TA diastólica" value={taDia} onChange={setTaDia} inputMode="numeric" valido={taDia !== ""} />
          <CampoFlotante label="Frec. cardíaca" value={fc} onChange={setFc} inputMode="numeric" valido={fc !== ""} />
          <CampoFlotante label="Frec. respiratoria" value={fr} onChange={setFr} inputMode="numeric" valido={fr !== ""} />
          <CampoFlotante label="SpO₂ (%)" value={spo2} onChange={setSpo2} inputMode="numeric" valido={spo2 !== ""} />
          <CampoFlotante label="Temperatura (°C)" value={temp} onChange={setTemp} inputMode="decimal" valido={temp !== ""} />
          <CampoFlotante label="Peso (kg)" value={peso} onChange={setPeso} inputMode="decimal" valido={peso !== ""} />
          <CampoFlotante label="Talla (cm)" value={talla} onChange={setTalla} inputMode="decimal" valido={talla !== ""} />
        </div>

        <div className="flex flex-wrap gap-2">
          {ta && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
              style={{ backgroundColor: `${ta.color}1e`, color: ta.color }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ta.color }} />
              Presión arterial: {ta.etiqueta}
            </span>
          )}
          {imc !== null && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
              style={{
                backgroundColor: `${claseImc?.color ?? "#8A6B78"}1e`,
                color: claseImc?.color ?? "var(--texto-secundario)",
              }}
            >
              IMC {imc}
              {claseImc && ` · ${claseImc.etiqueta}`}
            </span>
          )}
        </div>
      </Seccion>

      {/* Exploración física */}
      <Seccion indice={3} titulo="Exploración física">
        <AreaFlotante
          label="Hallazgos de la exploración"
          value={exploracion}
          onChange={setExploracion}
          rows={4}
          maxLength={4000}
        />
      </Seccion>

      {/* Impresión diagnóstica */}
      <Seccion
        indice={4}
        titulo="Impresión diagnóstica"
        descripcion="Puedes registrar varios diagnósticos."
      >
        <div className="space-y-2.5">
          <AnimatePresence initial={false}>
            {dx.map((d, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-start gap-2"
              >
                <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_9rem]">
                  <CampoFlotante
                    label={`Diagnóstico ${i + 1}`}
                    value={d.diagnostico}
                    onChange={(v) =>
                      setDx((arr) => arr.map((x, j) => (j === i ? { ...x, diagnostico: v } : x)))
                    }
                    maxLength={200}
                    valido={d.diagnostico.trim() !== ""}
                  />
                  <CampoFlotante
                    label="CIE-10 (opc.)"
                    value={d.cie10}
                    onChange={(v) =>
                      setDx((arr) => arr.map((x, j) => (j === i ? { ...x, cie10: v } : x)))
                    }
                    maxLength={15}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setDx((arr) => arr.filter((_, j) => j !== i))}
                  aria-label="Quitar diagnóstico"
                  className="mt-2 flex h-9 w-9 flex-none items-center justify-center rounded-suave border border-[var(--borde)] text-texto-secundario transition-colors hover:border-estado-urgente hover:text-estado-urgente"
                >
                  ×
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          <button
            type="button"
            onClick={nuevoDx}
            className="text-sm font-medium text-rosa-principal transition-colors hover:text-rosa-hover"
          >
            ＋ Agregar diagnóstico
          </button>
        </div>
      </Seccion>

      {/* Plan / conducta */}
      <Seccion indice={5} titulo="Plan y conducta">
        <AreaFlotante
          label="Plan terapéutico / conducta a seguir"
          value={plan}
          onChange={setPlan}
          rows={3}
          maxLength={4000}
        />
      </Seccion>

      {/* Prescripción */}
      <Seccion
        indice={6}
        titulo="Prescripción"
        descripcion="Medicamentos indicados con dosis, frecuencia y duración."
      >
        <div className="space-y-2.5">
          <AnimatePresence initial={false}>
            {rx.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-start gap-2"
              >
                <div className="grid flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <CampoFlotante
                    label={`Medicamento ${i + 1}`}
                    value={m.medicamento}
                    onChange={(v) => setRx((arr) => arr.map((x, j) => (j === i ? { ...x, medicamento: v } : x)))}
                    maxLength={120}
                    valido={m.medicamento.trim() !== ""}
                  />
                  <CampoFlotante
                    label="Dosis"
                    value={m.dosis}
                    onChange={(v) => setRx((arr) => arr.map((x, j) => (j === i ? { ...x, dosis: v } : x)))}
                    maxLength={80}
                  />
                  <CampoFlotante
                    label="Frecuencia"
                    value={m.frecuencia}
                    onChange={(v) => setRx((arr) => arr.map((x, j) => (j === i ? { ...x, frecuencia: v } : x)))}
                    maxLength={80}
                  />
                  <CampoFlotante
                    label="Duración"
                    value={m.duracion}
                    onChange={(v) => setRx((arr) => arr.map((x, j) => (j === i ? { ...x, duracion: v } : x)))}
                    maxLength={80}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setRx((arr) => arr.filter((_, j) => j !== i))}
                  aria-label="Quitar medicamento"
                  className="mt-2 flex h-9 w-9 flex-none items-center justify-center rounded-suave border border-[var(--borde)] text-texto-secundario transition-colors hover:border-estado-urgente hover:text-estado-urgente"
                >
                  ×
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          <button
            type="button"
            onClick={nuevoRx}
            className="text-sm font-medium text-rosa-principal transition-colors hover:text-rosa-hover"
          >
            ＋ Agregar medicamento
          </button>
        </div>
      </Seccion>

      {/* Evolución y reevaluación */}
      <Seccion indice={7} titulo="Evolución y seguimiento">
        <div className="grid gap-4">
          <CampoFlotante
            label="Próxima cita / reevaluación sugerida"
            value={reevaluacion}
            onChange={setReevaluacion}
            maxLength={120}
          />
          <AreaFlotante
            label="Notas de evolución"
            value={evolucion}
            onChange={setEvolucion}
            rows={3}
            maxLength={4000}
          />
        </div>
      </Seccion>

      {error && <Alerta tono="urgente">{error}</Alerta>}

      <div className="sticky bottom-0 flex items-center gap-2 rounded-tarjeta border border-[var(--borde)] bg-[var(--fondo)]/90 p-3 backdrop-blur-md">
        <Button type="submit" cargando={cargando}>
          {modo === "editar" ? "Guardar cambios" : "Guardar consulta"}
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
