import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requerirUsuaria } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { puedeUI } from "@/lib/permissions";
import { ConsultaForm } from "@/components/consultas/ConsultaForm";
import { factoresDeRiesgo } from "@/lib/cardio";
import type { Paciente } from "@/types/database";

export const metadata: Metadata = { title: "Nueva consulta" };

const UUID = /^[0-9a-f-]{36}$/i;

export default async function NuevaConsultaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cita?: string }>;
}) {
  const { id } = await params;
  const { cita } = await searchParams;
  const usuaria = await requerirUsuaria();

  if (!puedeUI(usuaria.rol, "consultas", "crear")) {
    redirect(`/panel/pacientes/${id}`);
  }

  const supabase = await createClient();
  const { data } = await supabase.from("pacientes").select("*").eq("id", id).single();
  if (!data) notFound();
  const p = data as Paciente;

  const factores = factoresDeRiesgo(p).map(
    (f) => `${f.etiqueta}${f.detalle ? ` · ${f.detalle}` : ""}`,
  );

  const citaId = cita && UUID.test(cita) ? cita : undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="animate-fade-up">
        <Link
          href={`/panel/pacientes/${id}`}
          className="text-sm text-texto-secundario hover:text-rosa-principal"
        >
          ← Volver a la ficha
        </Link>
        <h1 className="mt-2 font-display text-3xl font-semibold text-texto-principal">
          Nueva consulta
        </h1>
        <p className="mt-1 text-texto-secundario">
          {p.nombres} {p.apellidos}
          {citaId && " · desde una cita de la agenda"}
        </p>
      </header>

      <ConsultaForm
        pacienteId={p.id}
        paciente={{ nombres: p.nombres, apellidos: p.apellidos, alergias: p.alergias }}
        factores={factores}
        citaId={citaId}
        pesoInicial={p.peso}
        tallaInicial={p.talla}
      />
    </div>
  );
}
