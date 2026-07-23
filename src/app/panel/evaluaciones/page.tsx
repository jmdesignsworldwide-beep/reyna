import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requerirUsuaria } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { puedeUI } from "@/lib/permissions";
import { EvaluacionesGlobal, type FilaEvaluacion } from "@/components/global/EvaluacionesGlobal";
import type { Evaluacion, RiesgoCV } from "@/types/database";

export const metadata: Metadata = { title: "Evaluaciones" };

export default async function EvaluacionesPage() {
  const usuaria = await requerirUsuaria();
  if (!puedeUI(usuaria.rol, "evaluaciones", "ver")) redirect("/panel");

  const supabase = await createClient();
  const { data } = await supabase
    .from("evaluaciones")
    .select("id, paciente_id, fecha, estado, riesgo_cv, pacientes(nombres, apellidos, cedula)")
    .order("fecha", { ascending: false });

  const rows =
    (data as
      | (Pick<Evaluacion, "id" | "paciente_id" | "fecha" | "estado" | "riesgo_cv"> & {
          pacientes: { nombres: string; apellidos: string; cedula: string | null } | null;
        })[]
      | null) ?? [];

  const filas: FilaEvaluacion[] = rows.map((r) => ({
    id: r.id,
    pacienteId: r.paciente_id,
    pacienteNombre: r.pacientes ? `${r.pacientes.nombres} ${r.pacientes.apellidos}` : "Paciente",
    cedula: r.pacientes?.cedula ?? null,
    fecha: r.fecha,
    filtroValor: r.estado,
    estado: r.estado,
    riesgo_cv: r.riesgo_cv as RiesgoCV | null,
  }));

  return <EvaluacionesGlobal filas={filas} puedeBorrar={puedeUI(usuaria.rol, "evaluaciones", "borrar")} />;
}
