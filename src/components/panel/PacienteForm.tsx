"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alerta } from "@/components/ui/Alerta";
import { crearPaciente, actualizarPaciente } from "@/app/panel/pacientes/acciones";
import type { Paciente } from "@/types/database";

type Modo = "crear" | "editar";

const CAMPO_TEXTO = "campo";

function Campo({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
  required = false,
  maxLength,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  type?: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <div>
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
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className={CAMPO_TEXTO}
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
        className={`${CAMPO_TEXTO} resize-y`}
      />
    </div>
  );
}

export function PacienteForm({
  modo,
  paciente,
}: {
  modo: Modo;
  paciente?: Paciente;
}) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  async function enviar(formData: FormData) {
    setError(null);
    setExito(false);
    setCargando(true);

    const res =
      modo === "crear"
        ? await crearPaciente(formData)
        : await actualizarPaciente(paciente!.id, formData);

    setCargando(false);

    if (!res.ok) {
      setError(res.error ?? "Ocurrió un error.");
      return;
    }

    if (modo === "crear" && res.id) {
      router.push(`/panel/pacientes/${res.id}`);
      router.refresh();
    } else {
      setExito(true);
      router.refresh();
    }
  }

  return (
    <form action={enviar} className="space-y-6">
      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold text-texto-principal">
          Datos personales
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Nombres" name="nombres" required defaultValue={paciente?.nombres} placeholder="María Isabel" maxLength={80} />
          <Campo label="Apellidos" name="apellidos" required defaultValue={paciente?.apellidos} placeholder="Fernández Rosario" maxLength={80} />
          <Campo label="Cédula" name="cedula" defaultValue={paciente?.cedula} placeholder="001-0000000-0" maxLength={20} />
          <Campo label="Fecha de nacimiento" name="fecha_nacimiento" type="date" defaultValue={paciente?.fecha_nacimiento} />
          <div>
            <label htmlFor="sexo" className="mb-1.5 block text-sm text-texto-secundario">
              Sexo
            </label>
            <select id="sexo" name="sexo" defaultValue={paciente?.sexo ?? ""} className={CAMPO_TEXTO}>
              <option value="">Sin especificar</option>
              <option value="femenino">Femenino</option>
              <option value="masculino">Masculino</option>
            </select>
          </div>
          <Campo label="Tipo de sangre" name="tipo_sangre" defaultValue={paciente?.tipo_sangre} placeholder="O+" maxLength={8} />
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold text-texto-principal">
          Contacto
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Teléfono" name="telefono" type="tel" defaultValue={paciente?.telefono} placeholder="809-000-0000" maxLength={20} />
          <Campo label="Correo electrónico" name="correo" type="email" defaultValue={paciente?.correo} placeholder="paciente@correo.do" />
          <Area label="Dirección" name="direccion" defaultValue={paciente?.direccion} placeholder="Calle, sector, ciudad" />
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold text-texto-principal">
          Seguro médico
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="ARS (aseguradora)" name="ars" defaultValue={paciente?.ars} placeholder="ARS Humano, SeNaSa…" maxLength={80} />
          <Campo label="Número de afiliado" name="numero_afiliado" defaultValue={paciente?.numero_afiliado} maxLength={40} />
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold text-texto-principal">
          Información clínica
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Area label="Alergias" name="alergias" defaultValue={paciente?.alergias} placeholder="Medicamentos, alimentos…" />
          <Area label="Antecedentes (cardiológicos y generales)" name="antecedentes" defaultValue={paciente?.antecedentes} placeholder="Hipertensión, cirugías previas…" />
          <Area label="Notas" name="notas" defaultValue={paciente?.notas} />
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold text-texto-principal">
          Contacto de emergencia
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Nombre" name="contacto_emergencia_nombre" defaultValue={paciente?.contacto_emergencia_nombre} maxLength={80} />
          <Campo label="Teléfono" name="contacto_emergencia_telefono" type="tel" defaultValue={paciente?.contacto_emergencia_telefono} maxLength={20} />
        </div>
      </Card>

      {error && <Alerta tono="urgente">{error}</Alerta>}
      {exito && <Alerta tono="exito">Cambios guardados correctamente.</Alerta>}

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
