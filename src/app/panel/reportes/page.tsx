import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requerirUsuaria } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { puedeUI } from "@/lib/permissions";
import { ReportesGlobal, type FilaReporte } from "@/components/global/ReportesGlobal";
import type { Reporte } from "@/types/database";

export const metadata: Metadata = { title: "Reportes" };

export default async function ReportesPage() {
  const usuaria = await requerirUsuaria();
  if (!puedeUI(usuaria.rol, "reportes", "ver")) redirect("/panel");

  const supabase = await createClient();
  const { data } = await supabase
    .from("reportes")
    .select("id, paciente_id, tipo, titulo, fecha, pdf_path, resumen_texto, pacientes(nombres, apellidos, cedula, telefono)")
    .order("fecha", { ascending: false });

  const rows =
    (data as
      | (Pick<Reporte, "id" | "paciente_id" | "tipo" | "titulo" | "fecha" | "pdf_path" | "resumen_texto"> & {
          pacientes: { nombres: string; apellidos: string; cedula: string | null; telefono: string | null } | null;
        })[]
      | null) ?? [];

  const filas: FilaReporte[] = await Promise.all(
    rows.map(async (r) => {
      let pdfUrl: string | null = null;
      if (r.pdf_path) {
        const { data: firmada } = await supabase.storage.from("reportes").createSignedUrl(r.pdf_path, 600);
        pdfUrl = firmada?.signedUrl ?? null;
      }
      return {
        id: r.id,
        pacienteId: r.paciente_id,
        pacienteNombre: r.pacientes ? `${r.pacientes.nombres} ${r.pacientes.apellidos}` : "Paciente",
        cedula: r.pacientes?.cedula ?? null,
        fecha: r.fecha,
        filtroValor: r.tipo,
        tipo: r.tipo,
        titulo: r.titulo,
        telefono: r.pacientes?.telefono ?? null,
        pdfUrl,
        resumen: r.resumen_texto,
      };
    }),
  );

  return <ReportesGlobal filas={filas} puedeBorrar={puedeUI(usuaria.rol, "reportes", "borrar")} />;
}
