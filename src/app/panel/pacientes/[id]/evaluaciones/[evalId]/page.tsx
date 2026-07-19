import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requerirUsuaria } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { puedeUI } from "@/lib/permissions";
import { EvaluacionDoc } from "@/components/evaluaciones/EvaluacionDoc";
import { PanelFirma } from "@/components/evaluaciones/PanelFirma";
import { AccionesEvaluacion } from "@/components/evaluaciones/AccionesEvaluacion";
import { calcularEdad } from "@/lib/formato";
import { ETIQUETA_SEXO } from "@/lib/cardio";
import { ETIQUETA_ESTADO_EVALUACION } from "@/lib/evaluaciones";
import type { Evaluacion, Paciente } from "@/types/database";

export const metadata: Metadata = { title: "Evaluación formal" };

export default async function EvaluacionDetallePage({
  params,
}: {
  params: Promise<{ id: string; evalId: string }>;
}) {
  const { id, evalId } = await params;
  const usuaria = await requerirUsuaria();
  const supabase = await createClient();

  const { data: evData } = await supabase
    .from("evaluaciones")
    .select("*")
    .eq("id", evalId)
    .eq("paciente_id", id)
    .single();
  if (!evData) notFound(); // RLS oculta a roles sin permiso → 404 limpio.
  const ev = evData as Evaluacion;

  const { data: pData } = await supabase
    .from("pacientes")
    .select("nombres, apellidos, cedula, fecha_nacimiento, sexo")
    .eq("id", id)
    .single();
  const p = pData as Pick<
    Paciente,
    "nombres" | "apellidos" | "cedula" | "fecha_nacimiento" | "sexo"
  > | null;

  // URL firmada del PDF (bucket privado), solo si existe.
  let pdfUrl: string | null = null;
  if (ev.pdf_path) {
    const { data: firmada } = await supabase.storage
      .from("evaluaciones")
      .createSignedUrl(ev.pdf_path, 600);
    pdfUrl = firmada?.signedUrl ?? null;
  }

  const firmada = ev.estado === "firmada";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="animate-fade-up flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={`/panel/pacientes/${id}`}
            className="text-sm text-texto-secundario hover:text-rosa-principal"
          >
            ← {p ? `${p.nombres} ${p.apellidos}` : "Ficha del paciente"}
          </Link>
          <div className="mt-2 flex items-center gap-2">
            <h1 className="font-display text-2xl font-semibold text-texto-principal">
              Evaluación formal
            </h1>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: firmada ? "rgba(76,175,130,0.14)" : "var(--superficie-suave)",
                color: firmada ? "#4CAF82" : "var(--texto-secundario)",
              }}
            >
              {ETIQUETA_ESTADO_EVALUACION[ev.estado]}
            </span>
          </div>
        </div>
        <AccionesEvaluacion
          pacienteId={id}
          evaluacionId={ev.id}
          estado={ev.estado}
          puedeEditar={puedeUI(usuaria.rol, "evaluaciones", "editar")}
          puedeBorrar={puedeUI(usuaria.rol, "evaluaciones", "borrar")}
        />
      </header>

      <EvaluacionDoc
        evaluacion={ev}
        pacienteNombre={p ? `${p.nombres} ${p.apellidos}` : "Paciente"}
        pacienteCedula={p?.cedula ?? null}
        edad={p ? calcularEdad(p.fecha_nacimiento) : null}
        sexo={p?.sexo ? ETIQUETA_SEXO[p.sexo] : null}
      />

      <PanelFirma
        evaluacion={ev}
        esAdmin={usuaria.rol === "admin"}
        pdfUrl={pdfUrl}
        nombreMedicoSugerido={
          usuaria.rol === "admin" ? usuaria.nombre_completo : "Dra. Reyna Massiel"
        }
      />
    </div>
  );
}
