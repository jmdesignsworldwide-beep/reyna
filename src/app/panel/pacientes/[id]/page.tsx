import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requerirUsuaria } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { puedeUI } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { Alerta } from "@/components/ui/Alerta";
import { BotonArchivar } from "@/components/panel/BotonArchivar";
import { calcularEdad, formatearFecha, formatearFechaHora } from "@/lib/formato";
import type { Paciente, SexoPaciente } from "@/types/database";

export const metadata: Metadata = { title: "Ficha de paciente" };

const SEXO: Record<SexoPaciente, string> = {
  femenino: "Femenino",
  masculino: "Masculino",
};

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-texto-secundario">
        {etiqueta}
      </dt>
      <dd className="mt-0.5 text-texto-principal">{valor?.trim() || "—"}</dd>
    </div>
  );
}

export default async function FichaPacientePage({
  params,
}: {
  params: { id: string };
}) {
  const usuaria = await requerirUsuaria();
  const supabase = createClient();

  const { data } = await supabase
    .from("pacientes")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!data) notFound();
  const p = data as Paciente;

  const edad = calcularEdad(p.fecha_nacimiento);
  const puedeEditar = puedeUI(usuaria.rol, "pacientes", "editar");

  return (
    <div className="space-y-6">
      <header className="animate-fade-up flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/panel/pacientes"
            className="text-sm text-texto-secundario hover:text-rosa-principal"
          >
            ← Pacientes
          </Link>
          <h1 className="mt-2 font-display text-3xl font-semibold text-texto-principal">
            {p.nombres} {p.apellidos}
          </h1>
          <p className="mt-1 text-texto-secundario">
            {edad !== null ? `${edad} años` : "Edad no registrada"}
            {p.sexo ? ` · ${SEXO[p.sexo]}` : ""}
            {p.cedula ? ` · Cédula ${p.cedula}` : ""}
          </p>
        </div>
        {puedeEditar && (
          <div className="flex items-center gap-2">
            <Link
              href={`/panel/pacientes/${p.id}/editar`}
              className="rounded-suave bg-[linear-gradient(120deg,var(--rosa-principal),var(--rosa-medio))] px-4 py-2.5 text-sm font-medium text-white shadow-tarjeta transition-all hover:shadow-tarjeta-hover hover:brightness-105"
            >
              Editar
            </Link>
            <BotonArchivar id={p.id} activo={p.activo} />
          </div>
        )}
      </header>

      {!p.activo && (
        <Alerta tono="advertencia">
          Este paciente está archivado. Puedes reactivarlo con el botón
          “Reactivar”.
        </Alerta>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-display text-lg font-semibold text-texto-principal">
            Datos personales
          </h2>
          <dl className="grid grid-cols-2 gap-4">
            <Dato etiqueta="Nombres" valor={p.nombres} />
            <Dato etiqueta="Apellidos" valor={p.apellidos} />
            <Dato etiqueta="Cédula" valor={p.cedula} />
            <Dato
              etiqueta="Fecha de nacimiento"
              valor={p.fecha_nacimiento ? formatearFecha(p.fecha_nacimiento) : null}
            />
            <Dato etiqueta="Sexo" valor={p.sexo ? SEXO[p.sexo] : null} />
            <Dato etiqueta="Tipo de sangre" valor={p.tipo_sangre} />
          </dl>
        </Card>

        <Card>
          <h2 className="mb-4 font-display text-lg font-semibold text-texto-principal">
            Contacto
          </h2>
          <dl className="grid grid-cols-2 gap-4">
            <Dato etiqueta="Teléfono" valor={p.telefono} />
            <Dato etiqueta="Correo" valor={p.correo} />
            <div className="col-span-2">
              <Dato etiqueta="Dirección" valor={p.direccion} />
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="mb-4 font-display text-lg font-semibold text-texto-principal">
            Seguro médico
          </h2>
          <dl className="grid grid-cols-2 gap-4">
            <Dato etiqueta="ARS" valor={p.ars} />
            <Dato etiqueta="Número de afiliado" valor={p.numero_afiliado} />
          </dl>
        </Card>

        <Card>
          <h2 className="mb-4 font-display text-lg font-semibold text-texto-principal">
            Contacto de emergencia
          </h2>
          <dl className="grid grid-cols-2 gap-4">
            <Dato etiqueta="Nombre" valor={p.contacto_emergencia_nombre} />
            <Dato etiqueta="Teléfono" valor={p.contacto_emergencia_telefono} />
          </dl>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-4 font-display text-lg font-semibold text-texto-principal">
            Información clínica
          </h2>
          <dl className="space-y-4">
            <Dato etiqueta="Alergias" valor={p.alergias} />
            <Dato etiqueta="Antecedentes" valor={p.antecedentes} />
            <Dato etiqueta="Notas" valor={p.notas} />
          </dl>
        </Card>
      </div>

      <p className="text-xs text-texto-secundario">
        Registrado el {formatearFechaHora(p.created_at)} · Última actualización{" "}
        {formatearFechaHora(p.updated_at)}
      </p>
    </div>
  );
}
