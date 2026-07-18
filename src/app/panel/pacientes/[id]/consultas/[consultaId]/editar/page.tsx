import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requerirUsuaria } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { puedeUI } from "@/lib/permissions";
import { ConsultaForm } from "@/components/consultas/ConsultaForm";
import { factoresDeRiesgo } from "@/lib/cardio";
import type { Consulta, Paciente } from "@/types/database";

export const metadata: Metadata = { title: "Editar consulta" };

export default async function EditarConsultaPage({
  params,
}: {
  params: Promise<{ id: string; consultaId: string }>;
}) {
  const { id, consultaId } = await params;
  const usuaria = await requerirUsuaria();

  if (!puedeUI(usuaria.rol, "consultas", "editar")) {
    redirect(`/panel/pacientes/${id}/consultas/${consultaId}`);
  }

  const supabase = await createClient();

  const { data: cData } = await supabase
    .from("consultas")
    .select("*")
    .eq("id", consultaId)
    .eq("paciente_id", id)
    .single();
  if (!cData) notFound();
  const c = cData as Consulta;

  const { data: pData } = await supabase.from("pacientes").select("*").eq("id", id).single();
  if (!pData) notFound();
  const p = pData as Paciente;

  const factores = factoresDeRiesgo(p).map(
    (f) => `${f.etiqueta}${f.detalle ? ` · ${f.detalle}` : ""}`,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="animate-fade-up">
        <Link
          href={`/panel/pacientes/${id}/consultas/${consultaId}`}
          className="text-sm text-texto-secundario hover:text-rosa-principal"
        >
          ← Volver a la consulta
        </Link>
        <h1 className="mt-2 font-display text-3xl font-semibold text-texto-principal">
          Editar consulta
        </h1>
        <p className="mt-1 text-texto-secundario">
          {p.nombres} {p.apellidos}
        </p>
      </header>

      <ConsultaForm
        pacienteId={p.id}
        paciente={{ nombres: p.nombres, apellidos: p.apellidos, alergias: p.alergias }}
        factores={factores}
        modo="editar"
        consulta={c}
      />
    </div>
  );
}
