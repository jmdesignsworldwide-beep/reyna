import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requerirUsuaria } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { puedeUI } from "@/lib/permissions";
import { EstudiosGlobal, type FilaEstudio } from "@/components/global/EstudiosGlobal";
import type { Estudio } from "@/types/database";

export const metadata: Metadata = { title: "Estudios" };

export default async function EstudiosPage() {
  const usuaria = await requerirUsuaria();
  if (!puedeUI(usuaria.rol, "estudios", "ver")) redirect("/panel");

  const supabase = await createClient();
  const { data } = await supabase
    .from("estudios_cardiologicos")
    .select("id, paciente_id, fecha_estudio, tipo, conclusion, archivo_path, pacientes(nombres, apellidos, cedula)")
    .order("fecha_estudio", { ascending: false });

  const rows =
    (data as
      | (Pick<Estudio, "id" | "paciente_id" | "fecha_estudio" | "tipo" | "conclusion" | "archivo_path"> & {
          pacientes: { nombres: string; apellidos: string; cedula: string | null } | null;
        })[]
      | null) ?? [];

  const filas: FilaEstudio[] = await Promise.all(
    rows.map(async (r) => {
      let archivoUrl: string | null = null;
      if (r.archivo_path) {
        const { data: firmada } = await supabase.storage.from("estudios").createSignedUrl(r.archivo_path, 600);
        archivoUrl = firmada?.signedUrl ?? null;
      }
      return {
        id: r.id,
        pacienteId: r.paciente_id,
        pacienteNombre: r.pacientes ? `${r.pacientes.nombres} ${r.pacientes.apellidos}` : "Paciente",
        cedula: r.pacientes?.cedula ?? null,
        fecha: r.fecha_estudio,
        filtroValor: r.tipo,
        tipo: r.tipo,
        conclusion: r.conclusion,
        archivoUrl,
      };
    }),
  );

  return <EstudiosGlobal filas={filas} puedeBorrar={puedeUI(usuaria.rol, "estudios", "borrar")} />;
}
