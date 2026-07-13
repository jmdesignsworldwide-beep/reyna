"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CampoFlotante,
  AreaFlotante,
  SelectFlotante,
  Segmentado,
  ToggleCard,
} from "@/components/ui/campos";
import { Alerta } from "@/components/ui/Alerta";
import { HeartMark } from "@/components/ui/HeartMark";
import { crearPaciente, actualizarPaciente } from "@/app/panel/pacientes/acciones";
import {
  clasificacionIMC,
  ETIQUETA_DIABETES,
  ETIQUETA_TABAQUISMO,
  ETIQUETA_ESTADO_CIVIL,
} from "@/lib/cardio";
import { calcularEdad } from "@/lib/formato";
import type { Paciente, Medicamento } from "@/types/database";

type Modo = "crear" | "editar";

interface Estado {
  nombres: string;
  apellidos: string;
  cedula: string;
  fecha_nacimiento: string;
  sexo: string;
  estado_civil: string;
  ocupacion: string;
  tipo_sangre: string;
  telefono: string;
  telefono_secundario: string;
  correo: string;
  direccion: string;
  ciudad_sector: string;
  ars: string;
  numero_afiliado: string;
  tipo_plan: string;
  contacto_emergencia_nombre: string;
  contacto_emergencia_parentesco: string;
  contacto_emergencia_telefono: string;
  peso: string;
  talla: string;
  circunferencia_abdominal: string;
  rf_hipertension: boolean;
  rf_hipertension_desde: string;
  rf_diabetes: string;
  rf_diabetes_desde: string;
  rf_dislipidemia: boolean;
  rf_tabaquismo: string;
  rf_tabaquismo_paquetes_ano: string;
  rf_sedentarismo: boolean;
  rf_antecedentes_familiares: boolean;
  rf_antecedentes_familiares_parentesco: string;
  rf_enfermedad_renal: boolean;
  antecedentes_patologicos: string;
  antecedentes_quirurgicos: string;
  antecedentes_cardiovasculares: string;
  medicacion: Medicamento[];
  alergias: string;
  referido_por: string;
  notas: string;
}

function inicial(p?: Paciente): Estado {
  return {
    nombres: p?.nombres ?? "",
    apellidos: p?.apellidos ?? "",
    cedula: p?.cedula ?? "",
    fecha_nacimiento: p?.fecha_nacimiento ?? "",
    sexo: p?.sexo ?? "",
    estado_civil: p?.estado_civil ?? "",
    ocupacion: p?.ocupacion ?? "",
    tipo_sangre: p?.tipo_sangre ?? "",
    telefono: p?.telefono ?? "",
    telefono_secundario: p?.telefono_secundario ?? "",
    correo: p?.correo ?? "",
    direccion: p?.direccion ?? "",
    ciudad_sector: p?.ciudad_sector ?? "",
    ars: p?.ars ?? "",
    numero_afiliado: p?.numero_afiliado ?? "",
    tipo_plan: p?.tipo_plan ?? "",
    contacto_emergencia_nombre: p?.contacto_emergencia_nombre ?? "",
    contacto_emergencia_parentesco: p?.contacto_emergencia_parentesco ?? "",
    contacto_emergencia_telefono: p?.contacto_emergencia_telefono ?? "",
    peso: p?.peso?.toString() ?? "",
    talla: p?.talla?.toString() ?? "",
    circunferencia_abdominal: p?.circunferencia_abdominal?.toString() ?? "",
    rf_hipertension: p?.rf_hipertension ?? false,
    rf_hipertension_desde: p?.rf_hipertension_desde ?? "",
    rf_diabetes: p?.rf_diabetes ?? "no",
    rf_diabetes_desde: p?.rf_diabetes_desde ?? "",
    rf_dislipidemia: p?.rf_dislipidemia ?? false,
    rf_tabaquismo: p?.rf_tabaquismo ?? "nunca",
    rf_tabaquismo_paquetes_ano: p?.rf_tabaquismo_paquetes_ano?.toString() ?? "",
    rf_sedentarismo: p?.rf_sedentarismo ?? false,
    rf_antecedentes_familiares: p?.rf_antecedentes_familiares ?? false,
    rf_antecedentes_familiares_parentesco: p?.rf_antecedentes_familiares_parentesco ?? "",
    rf_enfermedad_renal: p?.rf_enfermedad_renal ?? false,
    antecedentes_patologicos: p?.antecedentes_patologicos ?? "",
    antecedentes_quirurgicos: p?.antecedentes_quirurgicos ?? "",
    antecedentes_cardiovasculares: p?.antecedentes_cardiovasculares ?? "",
    medicacion: p?.medicacion?.length ? p.medicacion : [],
    alergias: p?.alergias ?? "",
    referido_por: p?.referido_por ?? "",
    notas: p?.notas ?? "",
  };
}

const PASOS = [
  "Identidad",
  "Contacto",
  "Antropometría",
  "Riesgo",
  "Antecedentes",
  "Alergias",
  "Revisar",
];

const OPC_SEXO = [
  { valor: "", texto: "—" },
  { valor: "femenino", texto: "Femenino" },
  { valor: "masculino", texto: "Masculino" },
];
const OPC_ESTADO_CIVIL = [
  { valor: "", texto: "Sin especificar" },
  { valor: "soltero", texto: "Soltero/a" },
  { valor: "casado", texto: "Casado/a" },
  { valor: "union_libre", texto: "Unión libre" },
  { valor: "divorciado", texto: "Divorciado/a" },
  { valor: "viudo", texto: "Viudo/a" },
  { valor: "otro", texto: "Otro" },
];
const OPC_DIABETES = [
  { valor: "no", texto: "No" },
  { valor: "tipo_1", texto: "Tipo 1" },
  { valor: "tipo_2", texto: "Tipo 2" },
];
const OPC_TABAQUISMO = [
  { valor: "nunca", texto: "Nunca" },
  { valor: "exfumador", texto: "Exfumador" },
  { valor: "activo", texto: "Activo" },
];

export function PacienteForm({ modo, paciente }: { modo: Modo; paciente?: Paciente }) {
  const router = useRouter();
  const [f, setF] = useState<Estado>(() => inicial(paciente));
  const [[paso, dir], setPaso] = useState<[number, number]>([0, 0]);
  const [cargando, setCargando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof Estado>(k: K, v: Estado[K]) {
    setF((prev) => ({ ...prev, [k]: v }));
  }
  function ir(nuevo: number) {
    setPaso([Math.max(0, Math.min(PASOS.length - 1, nuevo)), nuevo > paso ? 1 : -1]);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Validez en vivo
  const vNombres = f.nombres.trim().length >= 2;
  const vApellidos = f.apellidos.trim().length >= 2;
  const vCedula = /^\d{3}-?\d{7}-?\d{1}$/.test(f.cedula.trim());
  const vCorreo = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.correo.trim());
  const requeridosOk = vNombres && vApellidos;

  const imc = useMemo(() => {
    const p = Number(f.peso.replace(",", "."));
    const t = Number(f.talla.replace(",", "."));
    if (!p || !t) return null;
    return Math.round((p / (t / 100) ** 2) * 10) / 10;
  }, [f.peso, f.talla]);
  const claseImc = clasificacionIMC(imc);

  const edad = calcularEdad(f.fecha_nacimiento || null);

  async function guardar() {
    if (!requeridosOk) {
      setError("Faltan nombres y apellidos.");
      ir(0);
      return;
    }
    setError(null);
    setCargando(true);

    const fd = new FormData();
    const asignar = (k: string, v: string) => fd.set(k, v);
    (
      [
        "nombres", "apellidos", "cedula", "fecha_nacimiento", "sexo", "estado_civil",
        "ocupacion", "tipo_sangre", "telefono", "telefono_secundario", "correo",
        "direccion", "ciudad_sector", "ars", "numero_afiliado", "tipo_plan",
        "contacto_emergencia_nombre", "contacto_emergencia_parentesco",
        "contacto_emergencia_telefono", "peso", "talla", "circunferencia_abdominal",
        "rf_hipertension_desde", "rf_diabetes", "rf_diabetes_desde", "rf_tabaquismo",
        "rf_tabaquismo_paquetes_ano", "rf_antecedentes_familiares_parentesco",
        "antecedentes_patologicos", "antecedentes_quirurgicos",
        "antecedentes_cardiovasculares", "tipo_sangre", "alergias", "referido_por", "notas",
      ] as const
    ).forEach((k) => asignar(k, String((f as unknown as Record<string, unknown>)[k] ?? "")));

    (["rf_hipertension", "rf_dislipidemia", "rf_sedentarismo", "rf_antecedentes_familiares", "rf_enfermedad_renal"] as const).forEach(
      (k) => fd.set(k, f[k] ? "true" : "false"),
    );
    fd.set("medicacion", JSON.stringify(f.medicacion.filter((m) => m.medicamento.trim() !== "")));

    const res = modo === "crear" ? await crearPaciente(fd) : await actualizarPaciente(paciente!.id, fd);
    if (!res.ok) {
      setCargando(false);
      setError(res.error ?? "No se pudo guardar.");
      return;
    }
    setExito(true);
    const destino = modo === "crear" ? `/panel/pacientes/${res.id}` : `/panel/pacientes/${paciente!.id}`;
    setTimeout(() => {
      router.push(destino);
      router.refresh();
    }, 1000);
  }

  if (exito) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-estado-exito text-white"
        >
          <motion.svg
            viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor"
            strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.15, duration: 0.5 }}
          >
            <motion.path d="M20 6 9 17l-5-5" />
          </motion.svg>
        </motion.div>
        <p className="font-display text-2xl font-semibold text-texto-principal">
          {modo === "crear" ? "Paciente registrado" : "Cambios guardados"}
        </p>
        <p className="text-sm text-texto-secundario">Abriendo la ficha…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Stepper paso={paso} onIr={ir} />

      <div className="tarjeta mt-6 overflow-hidden !p-6 sm:!p-8">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={paso}
            custom={dir}
            initial={{ opacity: 0, x: dir >= 0 ? 40 : -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir >= 0 ? -40 : 40 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {paso === 0 && (
              <Paso titulo="Identidad" subtitulo="Datos personales de la paciente.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <CampoFlotante label="Nombres" required value={f.nombres} onChange={(v) => set("nombres", v)} valido={vNombres} maxLength={80} />
                  <CampoFlotante label="Apellidos" required value={f.apellidos} onChange={(v) => set("apellidos", v)} valido={vApellidos} maxLength={80} />
                  <CampoFlotante label="Cédula" value={f.cedula} onChange={(v) => set("cedula", v)} valido={vCedula} maxLength={20} inputMode="numeric" />
                  <CampoFlotante label="Fecha de nacimiento" type="date" value={f.fecha_nacimiento} onChange={(v) => set("fecha_nacimiento", v)} valido={!!f.fecha_nacimiento} />
                  <Segmentado label="Sexo" value={f.sexo} onChange={(v) => set("sexo", v)} opciones={OPC_SEXO} />
                  <SelectFlotante label="Estado civil" value={f.estado_civil} onChange={(v) => set("estado_civil", v)} opciones={OPC_ESTADO_CIVIL} />
                  <CampoFlotante label="Ocupación" value={f.ocupacion} onChange={(v) => set("ocupacion", v)} maxLength={80} />
                  <CampoFlotante label="Grupo sanguíneo" value={f.tipo_sangre} onChange={(v) => set("tipo_sangre", v)} maxLength={8} />
                </div>
              </Paso>
            )}

            {paso === 1 && (
              <Paso titulo="Contacto y seguro" subtitulo="Cómo ubicarla y su cobertura médica.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <CampoFlotante label="Teléfono" type="tel" value={f.telefono} onChange={(v) => set("telefono", v)} maxLength={20} inputMode="tel" />
                  <CampoFlotante label="Teléfono secundario" type="tel" value={f.telefono_secundario} onChange={(v) => set("telefono_secundario", v)} maxLength={20} inputMode="tel" />
                  <CampoFlotante label="Correo electrónico" type="email" value={f.correo} onChange={(v) => set("correo", v)} valido={vCorreo} inputMode="email" />
                  <CampoFlotante label="Ciudad / sector" value={f.ciudad_sector} onChange={(v) => set("ciudad_sector", v)} maxLength={120} />
                  <div className="sm:col-span-2">
                    <AreaFlotante label="Dirección" value={f.direccion} onChange={(v) => set("direccion", v)} rows={2} maxLength={200} />
                  </div>
                  <CampoFlotante label="ARS (aseguradora)" value={f.ars} onChange={(v) => set("ars", v)} maxLength={80} />
                  <CampoFlotante label="Número de afiliado" value={f.numero_afiliado} onChange={(v) => set("numero_afiliado", v)} maxLength={40} />
                  <CampoFlotante label="Tipo de plan" value={f.tipo_plan} onChange={(v) => set("tipo_plan", v)} maxLength={80} />
                </div>
                <p className="mt-6 mb-2 text-sm font-medium text-rosa-medio">Contacto de emergencia</p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <CampoFlotante label="Nombre" value={f.contacto_emergencia_nombre} onChange={(v) => set("contacto_emergencia_nombre", v)} maxLength={80} />
                  <CampoFlotante label="Parentesco" value={f.contacto_emergencia_parentesco} onChange={(v) => set("contacto_emergencia_parentesco", v)} maxLength={40} />
                  <CampoFlotante label="Teléfono" type="tel" value={f.contacto_emergencia_telefono} onChange={(v) => set("contacto_emergencia_telefono", v)} maxLength={20} inputMode="tel" />
                </div>
              </Paso>
            )}

            {paso === 2 && (
              <Paso titulo="Antropometría" subtitulo="El IMC se calcula solo.">
                <div className="grid gap-4 sm:grid-cols-3">
                  <CampoFlotante label="Peso (kg)" value={f.peso} onChange={(v) => set("peso", v)} inputMode="decimal" valido={!!Number(f.peso)} />
                  <CampoFlotante label="Talla (cm)" value={f.talla} onChange={(v) => set("talla", v)} inputMode="decimal" valido={!!Number(f.talla)} />
                  <CampoFlotante label="Circ. abdominal (cm)" value={f.circunferencia_abdominal} onChange={(v) => set("circunferencia_abdominal", v)} inputMode="decimal" />
                </div>
                <div className="mt-6 flex items-center justify-center">
                  <IMCVisual imc={imc} clase={claseImc} />
                </div>
              </Paso>
            )}

            {paso === 3 && (
              <Paso titulo="Factores de riesgo cardiovascular" subtitulo="Toca los que apliquen.">
                <div className="grid gap-3 sm:grid-cols-2">
                  <ToggleCard activo={f.rf_hipertension} onToggle={() => set("rf_hipertension", !f.rf_hipertension)} titulo="Hipertensión arterial" color="#B14A73" />
                  <ToggleCard activo={f.rf_dislipidemia} onToggle={() => set("rf_dislipidemia", !f.rf_dislipidemia)} titulo="Dislipidemia" color="#C25A82" />
                  <ToggleCard activo={f.rf_sedentarismo} onToggle={() => set("rf_sedentarismo", !f.rf_sedentarismo)} titulo="Sedentarismo" color="#8A6B78" />
                  <ToggleCard activo={f.rf_antecedentes_familiares} onToggle={() => set("rf_antecedentes_familiares", !f.rf_antecedentes_familiares)} titulo="Antec. familiares de ECV" color="#C25A82" />
                  <ToggleCard activo={f.rf_enfermedad_renal} onToggle={() => set("rf_enfermedad_renal", !f.rf_enfermedad_renal)} titulo="Enfermedad renal crónica" color="#E0567A" />
                </div>

                <Condicional visible={f.rf_hipertension}>
                  <CampoFlotante label="HTA desde (año)" value={f.rf_hipertension_desde} onChange={(v) => set("rf_hipertension_desde", v)} maxLength={40} inputMode="numeric" />
                </Condicional>
                <Condicional visible={f.rf_antecedentes_familiares}>
                  <CampoFlotante label="Parentesco (antec. familiares)" value={f.rf_antecedentes_familiares_parentesco} onChange={(v) => set("rf_antecedentes_familiares_parentesco", v)} maxLength={80} />
                </Condicional>

                <div className="mt-5 space-y-4">
                  <Segmentado label="Diabetes mellitus" value={f.rf_diabetes} onChange={(v) => set("rf_diabetes", v)} opciones={OPC_DIABETES} />
                  <Condicional visible={f.rf_diabetes !== "no"}>
                    <CampoFlotante label="Diabetes desde (año)" value={f.rf_diabetes_desde} onChange={(v) => set("rf_diabetes_desde", v)} maxLength={40} inputMode="numeric" />
                  </Condicional>
                  <Segmentado label="Tabaquismo" value={f.rf_tabaquismo} onChange={(v) => set("rf_tabaquismo", v)} opciones={OPC_TABAQUISMO} />
                  <Condicional visible={f.rf_tabaquismo === "activo"}>
                    <CampoFlotante label="Paquetes-año" value={f.rf_tabaquismo_paquetes_ano} onChange={(v) => set("rf_tabaquismo_paquetes_ano", v)} inputMode="decimal" />
                  </Condicional>
                </div>
                <p className="mt-4 text-xs text-texto-secundario">
                  La obesidad se deriva automáticamente del IMC (≥ 30).
                </p>
              </Paso>
            )}

            {paso === 4 && (
              <Paso titulo="Antecedentes y medicación" subtitulo="Historia y tratamiento actual.">
                <div className="space-y-4">
                  <AreaFlotante label="Antecedentes patológicos" value={f.antecedentes_patologicos} onChange={(v) => set("antecedentes_patologicos", v)} />
                  <AreaFlotante label="Antecedentes quirúrgicos" value={f.antecedentes_quirurgicos} onChange={(v) => set("antecedentes_quirurgicos", v)} />
                  <AreaFlotante label="Antecedentes cardiovasculares (infarto, stent, arritmias…)" value={f.antecedentes_cardiovasculares} onChange={(v) => set("antecedentes_cardiovasculares", v)} />
                </div>
                <Medicacion lista={f.medicacion} onChange={(m) => set("medicacion", m)} />
              </Paso>
            )}

            {paso === 5 && (
              <Paso titulo="Alergias y estudios" subtitulo="Información crítica de seguridad.">
                <AreaFlotante label="Alergias (aparecerán como alerta crítica en la ficha)" value={f.alergias} onChange={(v) => set("alergias", v)} rows={3} alerta />
                {f.alergias.trim() !== "" && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mt-3">
                    <Alerta tono="urgente">
                      Estas alergias se mostrarán en <strong>rojo</strong> en toda la ficha de la paciente.
                    </Alerta>
                  </motion.div>
                )}
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <CampoFlotante label="Referido por" value={f.referido_por} onChange={(v) => set("referido_por", v)} maxLength={120} />
                </div>
                <div className="mt-4">
                  <AreaFlotante label="Notas generales" value={f.notas} onChange={(v) => set("notas", v)} rows={2} />
                </div>
                <div className="mt-5 flex items-start gap-3 rounded-suave border border-[var(--borde)] bg-[var(--superficie-suave)] p-4">
                  <HeartMark className="mt-0.5 h-5 w-5 flex-none" />
                  <p className="text-sm text-texto-secundario">
                    Los <strong>estudios cardiológicos</strong> (ecocardiograma, ECG, Holter, con su archivo PDF/imagen)
                    se agregan desde la ficha de la paciente una vez registrada.
                  </p>
                </div>
              </Paso>
            )}

            {paso === 6 && (
              <Resumen f={f} imc={imc} claseImc={claseImc} edad={edad} />
            )}
          </motion.div>
        </AnimatePresence>

        {error && (
          <div className="mt-5">
            <Alerta tono="urgente">{error}</Alerta>
          </div>
        )}

        {/* Navegación */}
        <div className="mt-7 flex items-center justify-between gap-3 border-t border-[var(--borde)] pt-5">
          <button
            type="button"
            onClick={() => (paso === 0 ? router.back() : ir(paso - 1))}
            className="rounded-suave border border-[var(--borde)] px-4 py-2.5 text-sm font-medium text-texto-secundario transition-colors hover:text-rosa-principal"
          >
            {paso === 0 ? "Cancelar" : "← Atrás"}
          </button>

          {paso < PASOS.length - 1 ? (
            <button
              type="button"
              onClick={() => ir(paso + 1)}
              className="rounded-suave bg-[linear-gradient(120deg,var(--rosa-principal),var(--rosa-medio))] px-5 py-2.5 text-sm font-medium text-white shadow-tarjeta transition-all hover:shadow-tarjeta-hover hover:brightness-105"
            >
              Continuar →
            </button>
          ) : (
            <button
              type="button"
              onClick={guardar}
              disabled={cargando || !requeridosOk}
              className="inline-flex items-center gap-2 rounded-suave bg-[linear-gradient(120deg,var(--rosa-principal),var(--rosa-medio))] px-6 py-2.5 text-sm font-medium text-white shadow-tarjeta transition-all hover:shadow-tarjeta-hover hover:brightness-105 disabled:opacity-60"
            >
              {cargando && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
              {modo === "crear" ? "Confirmar y registrar" : "Guardar cambios"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Stepper ----------
function Stepper({ paso, onIr }: { paso: number; onIr: (n: number) => void }) {
  return (
    <div>
      {/* Escritorio */}
      <div className="hidden items-center sm:flex">
        {PASOS.map((p, i) => {
          const completo = i < paso;
          const actual = i === paso;
          return (
            <div key={p} className="flex flex-1 items-center last:flex-none">
              <button
                type="button"
                onClick={() => onIr(i)}
                className="flex flex-col items-center gap-1.5"
              >
                <motion.span
                  animate={{
                    backgroundColor: completo || actual ? "#B14A73" : "rgba(177,74,115,0.10)",
                    color: completo || actual ? "#fff" : "#8A6B78",
                    scale: actual ? 1.1 : 1,
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold"
                >
                  {completo ? "✓" : i + 1}
                </motion.span>
                <span className={`text-[11px] font-medium ${actual ? "text-rosa-principal" : "text-texto-secundario"}`}>
                  {p}
                </span>
              </button>
              {i < PASOS.length - 1 && (
                <div className="mx-1.5 h-0.5 flex-1 overflow-hidden rounded-full bg-[var(--borde)]">
                  <motion.div
                    className="h-full bg-rosa-principal"
                    animate={{ width: i < paso ? "100%" : "0%" }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Móvil */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between">
          <span className="font-display text-lg font-semibold text-rosa-principal">
            {PASOS[paso]}
          </span>
          <span className="text-sm text-texto-secundario">
            Paso {paso + 1} de {PASOS.length}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--borde)]">
          <motion.div
            className="h-full rounded-full bg-[linear-gradient(90deg,var(--rosa-principal),var(--rosa-hover))]"
            animate={{ width: `${((paso + 1) / PASOS.length) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>
    </div>
  );
}

function Paso({ titulo, subtitulo, children }: { titulo: string; subtitulo: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-2xl font-semibold text-texto-principal">{titulo}</h2>
      <p className="mb-6 mt-1 text-sm text-texto-secundario">{subtitulo}</p>
      {children}
    </div>
  );
}

function Condicional({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0, marginTop: 0 }}
          animate={{ height: "auto", opacity: 1, marginTop: 12 }}
          exit={{ height: 0, opacity: 0, marginTop: 0 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function IMCVisual({ imc, clase }: { imc: number | null; clase: { etiqueta: string; color: string } | null }) {
  const color = clase?.color ?? "var(--rosa-principal)";
  return (
    <motion.div
      key={imc ?? "vacio"}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex w-full max-w-sm flex-col items-center gap-2 rounded-tarjeta border border-[var(--borde)] bg-[var(--superficie-suave)] px-6 py-7 text-center"
    >
      <span className="text-xs uppercase tracking-widest text-texto-secundario">Índice de masa corporal</span>
      <span className="font-display text-6xl font-semibold leading-none" style={{ color }}>
        {imc ?? "—"}
      </span>
      {clase ? (
        <span className="rounded-full px-3 py-1 text-sm font-medium" style={{ backgroundColor: `${color}1e`, color }}>
          {clase.etiqueta}
        </span>
      ) : (
        <span className="text-sm text-texto-secundario">Ingresa peso y talla</span>
      )}
    </motion.div>
  );
}

function Medicacion({ lista, onChange }: { lista: Medicamento[]; onChange: (m: Medicamento[]) => void }) {
  function actualizar(i: number, campo: keyof Medicamento, v: string) {
    onChange(lista.map((m, idx) => (idx === i ? { ...m, [campo]: v } : m)));
  }
  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-rosa-medio">Medicación actual</p>
        <button
          type="button"
          onClick={() => onChange([...lista, { medicamento: "", dosis: "", frecuencia: "" }])}
          className="rounded-suave border border-[var(--borde)] px-3 py-1.5 text-sm text-rosa-principal transition-colors hover:border-rosa-hover"
        >
          ＋ Agregar
        </button>
      </div>
      {lista.length === 0 && <p className="text-sm text-texto-secundario">Sin medicamentos registrados.</p>}
      <AnimatePresence initial={false}>
        {lista.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mb-2 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <input value={m.medicamento} onChange={(e) => actualizar(i, "medicamento", e.target.value)} placeholder="Medicamento" className="campo !py-2.5" maxLength={120} />
              <input value={m.dosis} onChange={(e) => actualizar(i, "dosis", e.target.value)} placeholder="Dosis" className="campo !py-2.5" maxLength={80} />
              <input value={m.frecuencia} onChange={(e) => actualizar(i, "frecuencia", e.target.value)} placeholder="Frecuencia" className="campo !py-2.5" maxLength={80} />
              <button
                type="button"
                onClick={() => onChange(lista.filter((_, idx) => idx !== i))}
                className="rounded-suave border border-[var(--borde)] px-3 text-texto-secundario transition-colors hover:border-estado-urgente hover:text-estado-urgente"
                aria-label="Quitar"
              >
                ✕
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ---------- Resumen ----------
function Resumen({
  f,
  imc,
  claseImc,
  edad,
}: {
  f: Estado;
  imc: number | null;
  claseImc: { etiqueta: string; color: string } | null;
  edad: number | null;
}) {
  const factores: string[] = [];
  if (f.rf_hipertension) factores.push("Hipertensión");
  if (f.rf_diabetes !== "no") factores.push(`Diabetes ${ETIQUETA_DIABETES[f.rf_diabetes as "tipo_1" | "tipo_2" | "no"].toLowerCase()}`);
  if (f.rf_dislipidemia) factores.push("Dislipidemia");
  if (f.rf_tabaquismo === "activo") factores.push("Tabaquismo activo");
  if (f.rf_sedentarismo) factores.push("Sedentarismo");
  if (imc && imc >= 30) factores.push("Obesidad");
  if (f.rf_antecedentes_familiares) factores.push("Antec. familiares");
  if (f.rf_enfermedad_renal) factores.push("Enf. renal crónica");
  const meds = f.medicacion.filter((m) => m.medicamento.trim() !== "");

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold text-texto-principal">Revisar y confirmar</h2>
      <p className="mb-6 mt-1 text-sm text-texto-secundario">Verifica los datos antes de guardar.</p>

      <div className="rounded-tarjeta border border-[var(--borde)] bg-[var(--superficie-suave)] p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-[linear-gradient(120deg,var(--rosa-principal),var(--rosa-medio))] font-display text-xl font-semibold text-white">
            {(f.nombres[0] ?? "").toUpperCase()}{(f.apellidos[0] ?? "").toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-xl font-semibold text-texto-principal">
              {f.nombres || "—"} {f.apellidos}
            </p>
            <p className="text-sm text-texto-secundario">
              {edad !== null ? `${edad} años` : "Edad no registrada"}
              {f.sexo ? ` · ${f.sexo === "femenino" ? "Femenino" : "Masculino"}` : ""}
              {f.cedula ? ` · ${f.cedula}` : ""}
            </p>
          </div>
        </div>

        {f.alergias.trim() !== "" && (
          <div className="mt-4 flex items-start gap-2 rounded-suave border p-3" style={{ borderColor: "#E0567A", backgroundColor: "#E0567A14" }}>
            <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-estado-urgente text-xs font-bold text-white">!</span>
            <p className="text-sm text-texto-principal"><strong className="text-estado-urgente">Alergias:</strong> {f.alergias}</p>
          </div>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <ResumenDato etiqueta="Teléfono" valor={f.telefono} />
          <ResumenDato etiqueta="ARS" valor={f.ars} />
          <ResumenDato etiqueta="Estado civil" valor={f.estado_civil ? ETIQUETA_ESTADO_CIVIL[f.estado_civil as keyof typeof ETIQUETA_ESTADO_CIVIL] : ""} />
          <ResumenDato etiqueta="IMC" valor={imc ? `${imc}${claseImc ? ` · ${claseImc.etiqueta}` : ""}` : ""} />
          <ResumenDato etiqueta="Grupo sanguíneo" valor={f.tipo_sangre} />
          <ResumenDato etiqueta="Tabaquismo" valor={ETIQUETA_TABAQUISMO[f.rf_tabaquismo as keyof typeof ETIQUETA_TABAQUISMO]} />
        </div>

        <div className="mt-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-texto-secundario">Factores de riesgo</p>
          {factores.length === 0 ? (
            <p className="text-sm text-texto-secundario">Ninguno registrado.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {factores.map((x) => (
                <span key={x} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs" style={{ borderColor: "#E8A13C66", backgroundColor: "#E8A13C14", color: "var(--texto-principal)" }}>
                  <span className="h-1.5 w-1.5 rounded-full bg-estado-advertencia" />
                  {x}
                </span>
              ))}
            </div>
          )}
        </div>

        {meds.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs uppercase tracking-wide text-texto-secundario">Medicación</p>
            <ul className="space-y-1 text-sm text-texto-principal">
              {meds.map((m, i) => (
                <li key={i}>
                  <span className="font-medium">{m.medicamento}</span>
                  {m.dosis ? ` · ${m.dosis}` : ""}{m.frecuencia ? ` · ${m.frecuencia}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function ResumenDato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-texto-secundario">{etiqueta}</p>
      <p className="mt-0.5 text-sm text-texto-principal">{valor?.trim() || "—"}</p>
    </div>
  );
}
