import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requerirUsuaria } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { puedeUI } from "@/lib/permissions";
import { EvaluacionForm } from "@/components/evaluaciones/EvaluacionForm";
import { ETIQUETA_TIPO_ESTUDIO } from "@/lib/cardio";
import type { Evaluacion, Paciente, Estudio, EstudioRevisado } from "@/types/database";

export const metadata: Metadata = { title: "Editar evaluación" };

export default async function EditarEvaluacionPage({
  params,
}: {
  params: Promise<{ id: string; evalId: string }>;
}) {
  const { id, evalId } = await params;
  const usuaria = await requerirUsuaria();

  if (!puedeUI(usuaria.rol, "evaluaciones", "editar")) {
    redirect(`/panel/pacientes/${id}/evaluaciones/${evalId}`);
  }

  const supabase = await createClient();

  const { data: evData } = await supabase
    .from("evaluaciones")
    .select("*")
    .eq("id", evalId)
    .eq("paciente_id", id)
    .single();
  if (!evData) notFound();
  const ev = evData as Evaluacion;

  // Una evaluación firmada es inmutable: no se edita.
  if (ev.estado === "firmada") {
    redirect(`/panel/pacientes/${id}/evaluaciones/${evalId}`);
  }

  const { data: pData } = await supabase.from("pacientes").select("*").eq("id", id).single();
  if (!pData) notFound();
  const p = pData as Paciente;

  const { data: estudiosRaw } = await supabase
    .from("estudios_cardiologicos")
    .select("id, tipo, fecha_estudio")
    .eq("paciente_id", id)
    .order("fecha_estudio", { ascending: false });

  const estudiosDisponibles: EstudioRevisado[] = (
    (estudiosRaw as Pick<Estudio, "id" | "tipo" | "fecha_estudio">[] | null) ?? []
  ).map((s) => ({ id: s.id, tipo: ETIQUETA_TIPO_ESTUDIO[s.tipo], fecha: s.fecha_estudio }));

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="animate-fade-up">
        <Link
          href={`/panel/pacientes/${id}/evaluaciones/${evalId}`}
          className="text-sm text-texto-secundario hover:text-rosa-principal"
        >
          ← Volver a la evaluación
        </Link>
        <h1 className="mt-2 font-display text-3xl font-semibold text-texto-principal">
          Editar evaluación
        </h1>
        <p className="mt-1 text-texto-secundario">
          {p.nombres} {p.apellidos}
        </p>
      </header>

      <EvaluacionForm
        pacienteId={p.id}
        paciente={{ nombres: p.nombres, apellidos: p.apellidos, alergias: p.alergias }}
        estudiosDisponibles={estudiosDisponibles}
        modo="editar"
        evaluacion={ev}
      />
    </div>
  );
}
