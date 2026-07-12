"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alerta } from "@/components/ui/Alerta";
import { crearPaciente, actualizarPaciente } from "@/app/panel/pacientes/acciones";
import { clasificacionIMC } from "@/lib/cardio";
import type { Paciente, Medicamento } from "@/types/database";

type Modo = "crear" | "editar";

function Campo({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
  required,
  maxLength,
  onChange,
  colSpan,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  onChange?: (v: string) => void;
  colSpan?: boolean;
}) {
  return (
    <div className={colSpan ? "sm:col-span-2" : undefined}>
      <label htmlFor={name} className="mb-1.5 block text-sm text-texto-secundario">
        {label}
        {required && <span className="text-estado-urgente"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        maxLength={maxLength}
        step={type === "number" ? "any" : undefined}
        min={type === "number" ? "0" : undefined}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className="campo"
      />
    </div>
  );
}

function Area({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
}) {
  return (
    <div className="sm:col-span-2">
      <label htmlFor={name} className="mb-1.5 block text-sm text-texto-secundario">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={3}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="campo resize-y"
      />
    </div>
  );
}

function Select({
  label,
  name,
  defaultValue,
  opciones,
  onChange,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  opciones: { valor: string; texto: string }[];
  onChange?: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm text-texto-secundario">
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className="campo"
      >
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
    </div>
  );
}

function Check({
  label,
  name,
  defaultChecked,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-suave border border-[var(--borde)] bg-[var(--superficie-suave)] px-3 py-2.5 text-sm text-texto-principal">
      <input
        type="checkbox"
        name={name}
        value="true"
        defaultChecked={defaultChecked}
        className="h-4 w-4 accent-rosa-principal"
      />
      {label}
    </label>
  );
}

export function PacienteForm({ modo, paciente }: { modo: Modo; paciente?: Paciente }) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  // IMC en vivo
  const [peso, setPeso] = useState<string>(paciente?.peso?.toString() ?? "");
  const [talla, setTalla] = useState<string>(paciente?.talla?.toString() ?? "");
  const imcVivo = useMemo(() => {
    const p = Number(peso);
    const t = Number(talla);
    if (!p || !t) return null;
    return Math.round((p / (t / 100) ** 2) * 10) / 10;
  }, [peso, talla]);
  const claseImc = clasificacionIMC(imcVivo);

  // Medicación (repetidor)
  const [meds, setMeds] = useState<Medicamento[]>(
    paciente?.medicacion?.length
      ? paciente.medicacion
      : [{ medicamento: "", dosis: "", frecuencia: "" }],
  );
  function setMed(i: number, campo: keyof Medicamento, valor: string) {
    setMeds((prev) => prev.map((m, idx) => (idx === i ? { ...m, [campo]: valor } : m)));
  }
  const medsLimpios = meds.filter((m) => m.medicamento.trim() !== "");

  async function enviar(formData: FormData) {
    setError(null);
    setExito(false);
    setCargando(true);
    formData.set("medicacion", JSON.stringify(medsLimpios));

    const res =
      modo === "crear"
        ? await crearPaciente(formData)
        : await actualizarPaciente(paciente!.id, formData);

    setCargando(false);
    if (!res.ok) {
      setError(res.error ?? "Ocurrió un error.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (modo === "crear" && res.id) {
      router.push(`/panel/pacientes/${res.id}`);
      router.refresh();
    } else {
      setExito(true);
      router.refresh();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <form action={enviar} className="space-y-6">
      {error && <Alerta tono="urgente">{error}</Alerta>}
      {exito && <Alerta tono="exito">Cambios guardados correctamente.</Alerta>}

      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold text-texto-principal">
          Identificación y demográficos
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Nombres" name="nombres" required defaultValue={paciente?.nombres} placeholder="María Isabel" maxLength={80} />
          <Campo label="Apellidos" name="apellidos" required defaultValue={paciente?.apellidos} placeholder="Fernández Rosario" maxLength={80} />
          <Campo label="Cédula" name="cedula" defaultValue={paciente?.cedula} placeholder="000-0000000-0" maxLength={20} />
          <Campo label="Fecha de nacimiento" name="fecha_nacimiento" type="date" defaultValue={paciente?.fecha_nacimiento} />
          <Select
            label="Sexo"
            name="sexo"
            defaultValue={paciente?.sexo}
            opciones={[
              { valor: "", texto: "Sin especificar" },
              { valor: "femenino", texto: "Femenino" },
              { valor: "masculino", texto: "Masculino" },
            ]}
          />
          <Select
            label="Estado civil"
            name="estado_civil"
            defaultValue={paciente?.estado_civil}
            opciones={[
              { valor: "", texto: "Sin especificar" },
              { valor: "soltero", texto: "Soltero/a" },
              { valor: "casado", texto: "Casado/a" },
              { valor: "union_libre", texto: "Unión libre" },
              { valor: "divorciado", texto: "Divorciado/a" },
              { valor: "viudo", texto: "Viudo/a" },
              { valor: "otro", texto: "Otro" },
            ]}
          />
          <Campo label="Ocupación" name="ocupacion" defaultValue={paciente?.ocupacion} maxLength={80} />
          <Campo label="Grupo sanguíneo" name="tipo_sangre" defaultValue={paciente?.tipo_sangre} placeholder="O+" maxLength={8} />
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold text-texto-principal">Contacto</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Teléfono" name="telefono" type="tel" defaultValue={paciente?.telefono} placeholder="809-000-0000" maxLength={20} />
          <Campo label="Teléfono secundario" name="telefono_secundario" type="tel" defaultValue={paciente?.telefono_secundario} maxLength={20} />
          <Campo label="Correo electrónico" name="correo" type="email" defaultValue={paciente?.correo} placeholder="paciente@correo.do" />
          <Campo label="Ciudad / sector" name="ciudad_sector" defaultValue={paciente?.ciudad_sector} maxLength={120} />
          <Area label="Dirección" name="direccion" defaultValue={paciente?.direccion} placeholder="Calle, número, referencia" />
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold text-texto-principal">Seguro médico</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="ARS (aseguradora)" name="ars" defaultValue={paciente?.ars} placeholder="ARS Humano, SeNaSa…" maxLength={80} />
          <Campo label="Número de afiliado" name="numero_afiliado" defaultValue={paciente?.numero_afiliado} maxLength={40} />
          <Campo label="Tipo de plan" name="tipo_plan" defaultValue={paciente?.tipo_plan} placeholder="Contributivo, complementario…" maxLength={80} />
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold text-texto-principal">Contacto de emergencia</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Nombre" name="contacto_emergencia_nombre" defaultValue={paciente?.contacto_emergencia_nombre} maxLength={80} />
          <Campo label="Parentesco" name="contacto_emergencia_parentesco" defaultValue={paciente?.contacto_emergencia_parentesco} placeholder="Esposo/a, hijo/a…" maxLength={40} />
          <Campo label="Teléfono" name="contacto_emergencia_telefono" type="tel" defaultValue={paciente?.contacto_emergencia_telefono} maxLength={20} />
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold text-texto-principal">Antropometría</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Peso (kg)" name="peso" type="number" defaultValue={paciente?.peso} onChange={setPeso} />
          <Campo label="Talla (cm)" name="talla" type="number" defaultValue={paciente?.talla} onChange={setTalla} />
          <Campo label="Circunferencia abdominal (cm)" name="circunferencia_abdominal" type="number" defaultValue={paciente?.circunferencia_abdominal} />
          <div className="flex flex-col justify-end">
            <span className="mb-1.5 text-sm text-texto-secundario">IMC (calculado)</span>
            <div className="flex items-center gap-2 rounded-suave border border-[var(--borde)] bg-[var(--superficie-suave)] px-3 py-2.5">
              <span className="font-display text-lg font-semibold text-texto-principal">
                {imcVivo ?? "—"}
              </span>
              {claseImc && (
                <span className="text-sm font-medium" style={{ color: claseImc.color }}>
                  {claseImc.etiqueta}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-lg font-semibold text-texto-principal">
          Factores de riesgo cardiovascular
        </h2>
        <p className="mb-4 mt-1 text-sm text-texto-secundario">
          Marca los que apliquen; se resumen en el perfil de riesgo de la ficha.
        </p>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Check label="Hipertensión arterial" name="rf_hipertension" defaultChecked={paciente?.rf_hipertension} />
            <Campo label="HTA desde (año)" name="rf_hipertension_desde" defaultValue={paciente?.rf_hipertension_desde} placeholder="2019" maxLength={40} />
            <Select
              label="Diabetes mellitus"
              name="rf_diabetes"
              defaultValue={paciente?.rf_diabetes ?? "no"}
              opciones={[
                { valor: "no", texto: "No" },
                { valor: "tipo_1", texto: "Tipo 1" },
                { valor: "tipo_2", texto: "Tipo 2" },
              ]}
            />
            <Campo label="Diabetes desde (año)" name="rf_diabetes_desde" defaultValue={paciente?.rf_diabetes_desde} placeholder="2020" maxLength={40} />
            <Select
              label="Tabaquismo"
              name="rf_tabaquismo"
              defaultValue={paciente?.rf_tabaquismo ?? "nunca"}
              opciones={[
                { valor: "nunca", texto: "Nunca" },
                { valor: "exfumador", texto: "Exfumador" },
                { valor: "activo", texto: "Activo" },
              ]}
            />
            <Campo label="Paquetes-año (si aplica)" name="rf_tabaquismo_paquetes_ano" type="number" defaultValue={paciente?.rf_tabaquismo_paquetes_ano} />
            <Campo label="Parentesco (antec. familiares)" name="rf_antecedentes_familiares_parentesco" defaultValue={paciente?.rf_antecedentes_familiares_parentesco} placeholder="Padre, madre…" maxLength={80} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Check label="Dislipidemia" name="rf_dislipidemia" defaultChecked={paciente?.rf_dislipidemia} />
            <Check label="Sedentarismo" name="rf_sedentarismo" defaultChecked={paciente?.rf_sedentarismo} />
            <Check label="Antec. familiares de ECV" name="rf_antecedentes_familiares" defaultChecked={paciente?.rf_antecedentes_familiares} />
            <Check label="Enfermedad renal crónica" name="rf_enfermedad_renal" defaultChecked={paciente?.rf_enfermedad_renal} />
          </div>
          <p className="text-xs text-texto-secundario">
            La obesidad se deriva automáticamente del IMC (≥ 30).
          </p>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold text-texto-principal">
          Antecedentes personales
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Area label="Antecedentes patológicos" name="antecedentes_patologicos" defaultValue={paciente?.antecedentes_patologicos} />
          <Area label="Antecedentes quirúrgicos" name="antecedentes_quirurgicos" defaultValue={paciente?.antecedentes_quirurgicos} />
          <Area label="Antecedentes cardiovasculares (infarto, stent, arritmias…)" name="antecedentes_cardiovasculares" defaultValue={paciente?.antecedentes_cardiovasculares} />
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-texto-principal">
            Medicación actual
          </h2>
          <button
            type="button"
            onClick={() => setMeds((m) => [...m, { medicamento: "", dosis: "", frecuencia: "" }])}
            className="rounded-suave border border-[var(--borde)] px-3 py-1.5 text-sm text-rosa-principal transition-colors hover:border-rosa-hover"
          >
            ＋ Agregar medicamento
          </button>
        </div>
        <div className="space-y-3">
          {meds.map((m, i) => (
            <div key={i} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <input
                value={m.medicamento}
                onChange={(e) => setMed(i, "medicamento", e.target.value)}
                placeholder="Medicamento"
                className="campo"
                maxLength={120}
              />
              <input
                value={m.dosis}
                onChange={(e) => setMed(i, "dosis", e.target.value)}
                placeholder="Dosis (ej. 50 mg)"
                className="campo"
                maxLength={80}
              />
              <input
                value={m.frecuencia}
                onChange={(e) => setMed(i, "frecuencia", e.target.value)}
                placeholder="Frecuencia (ej. c/12 h)"
                className="campo"
                maxLength={80}
              />
              <button
                type="button"
                onClick={() => setMeds((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))}
                aria-label="Quitar medicamento"
                className="rounded-suave border border-[var(--borde)] px-3 text-texto-secundario transition-colors hover:border-estado-urgente hover:text-estado-urgente"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold text-texto-principal">
          Alergias y otros
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Area
            label="Alergias (se mostrarán como alerta crítica en la ficha)"
            name="alergias"
            defaultValue={paciente?.alergias}
            placeholder="Penicilina, mariscos… (dejar vacío si no aplica)"
          />
          <Campo label="Referido por" name="referido_por" defaultValue={paciente?.referido_por} maxLength={120} />
          <Area label="Notas generales" name="notas" defaultValue={paciente?.notas} />
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" cargando={cargando}>
          {modo === "crear" ? "Registrar paciente" : "Guardar cambios"}
        </Button>
        <Button type="button" variante="secundario" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
