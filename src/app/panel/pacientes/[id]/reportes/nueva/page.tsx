import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requerirUsuaria } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { puedeUI } from "@/lib/permissions";
import { GeneradorReporte } from "@/components/reportes/GeneradorReporte";
import type { Paciente, Consulta, Estudio } from "@/types/database";

export const metadata: Metadata = { title: "Generar reporte" };

export default async function NuevoReportePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const usuaria = await requerirUsuaria();
  if (!puedeUI(usuaria.rol, "reportes", "crear")) {
    redirect(`/panel/pacientes/${id}`);
  }

  const supabase = await createClient();
  const [{ data: pacData }, { data: consultasRaw }, { data: estudiosRaw }] = await Promise.all([
    supabase.from("pacientes").select("*").eq("id", id).single(),
    supabase
      .from("consultas")
      .select("*")
      .eq("paciente_id", id)
      .order("fecha", { ascending: false }),
    supabase
      .from("estudios_cardiologicos")
      .select("*")
      .eq("paciente_id", id)
      .order("fecha_estudio", { ascending: false }),
  ]);

  if (!pacData) notFound();

  return (
    <GeneradorReporte
      paciente={pacData as Paciente}
      consultas={(consultasRaw as Consulta[] | null) ?? []}
      estudios={(estudiosRaw as Estudio[] | null) ?? []}
    />
  );
}
