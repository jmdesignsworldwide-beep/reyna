import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requerirUsuaria } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { puedeUI } from "@/lib/permissions";
import { EvaluacionForm } from "@/components/evaluaciones/EvaluacionForm";
import { factoresDeRiesgo } from "@/lib/cardio";
import { ETIQUETA_TIPO_ESTUDIO } from "@/lib/cardio";
import { sugerirRiesgo } from "@/lib/evaluaciones";
import type { Paciente, Estudio, EstudioRevisado } from "@/types/database";

export const metadata: Metadata = { title: "Nueva evaluación" };

export default async function NuevaEvaluacionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const usuaria = await requerirUsuaria();

  if (!puedeUI(usuaria.rol, "evaluaciones", "crear")) {
    redirect(`/panel/pacientes/${id}`);
  }

  const supabase = await createClient();
  const { data } = await supabase.from("pacientes").select("*").eq("id", id).single();
  if (!data) notFound();
  const p = data as Paciente;

  const factores = factoresDeRiesgo(p);
  const factoresTexto = factores
    .map((f) => `${f.etiqueta}${f.detalle ? ` (${f.detalle})` : ""}`)
    .join(", ");

  const antecedentes = [p.antecedentes_patologicos, p.antecedentes_cardiovasculares]
    .filter((x) => (x ?? "").trim() !== "")
    .join("\n");

  const antFamiliares = p.rf_antecedentes_familiares
    ? `Antecedentes familiares de enfermedad cardiovascular${
        p.rf_antecedentes_familiares_parentesco
          ? ` (${p.rf_antecedentes_familiares_parentesco})`
          : ""
      }`
    : "";

  const { data: estudiosRaw } = await supabase
    .from("estudios_cardiologicos")
    .select("id, tipo, fecha_estudio")
    .eq("paciente_id", id)
    .order("fecha_estudio", { ascending: false });

  const estudiosDisponibles: EstudioRevisado[] = (
    (estudiosRaw as Pick<Estudio, "id" | "tipo" | "fecha_estudio">[] | null) ?? []
  ).map((s) => ({
    id: s.id,
    tipo: ETIQUETA_TIPO_ESTUDIO[s.tipo],
    fecha: s.fecha_estudio,
  }));

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
          Nueva evaluación formal
        </h1>
        <p className="mt-1 text-texto-secundario">
          {p.nombres} {p.apellidos}
        </p>
      </header>

      <EvaluacionForm
        pacienteId={p.id}
        paciente={{ nombres: p.nombres, apellidos: p.apellidos, alergias: p.alergias }}
        estudiosDisponibles={estudiosDisponibles}
        prefill={{
          factores_riesgo: factoresTexto,
          antecedentes,
          antecedentes_familiares: antFamiliares,
          peso: p.peso,
          talla: p.talla,
          riesgo_cv: sugerirRiesgo(factores.length),
        }}
      />
    </div>
  );
}
