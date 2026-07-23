import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requerirUsuaria } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { puedeUI } from "@/lib/permissions";
import { ConsultasGlobal, type FilaConsulta } from "@/components/global/ConsultasGlobal";
import type { Consulta } from "@/types/database";

export const metadata: Metadata = { title: "Consultas" };

export default async function ConsultasPage() {
  const usuaria = await requerirUsuaria();
  if (!puedeUI(usuaria.rol, "consultas", "ver")) redirect("/panel");

  const supabase = await createClient();
  const { data } = await supabase
    .from("consultas")
    .select("id, paciente_id, fecha, tipo, diagnosticos, created_by, pacientes(nombres, apellidos, cedula)")
    .order("fecha", { ascending: false });

  const rows =
    (data as
      | (Pick<Consulta, "id" | "paciente_id" | "fecha" | "tipo" | "diagnosticos" | "created_by"> & {
          pacientes: { nombres: string; apellidos: string; cedula: string | null } | null;
        })[]
      | null) ?? [];

  // Nombres de quién registró (best-effort; si RLS lo restringe, se omite).
  const ids = [...new Set(rows.map((r) => r.created_by).filter(Boolean))] as string[];
  const nombres = new Map<string, string>();
  if (ids.length > 0) {
    const { data: profs } = await supabase.from("profiles").select("id, nombre_completo").in("id", ids);
    for (const p of (profs as { id: string; nombre_completo: string }[] | null) ?? []) {
      nombres.set(p.id, p.nombre_completo);
    }
  }

  const filas: FilaConsulta[] = rows.map((r) => ({
    id: r.id,
    pacienteId: r.paciente_id,
    pacienteNombre: r.pacientes ? `${r.pacientes.nombres} ${r.pacientes.apellidos}` : "Paciente",
    cedula: r.pacientes?.cedula ?? null,
    fecha: r.fecha,
    filtroValor: r.tipo,
    tipo: r.tipo,
    diagnostico: r.diagnosticos?.[0]?.diagnostico ?? null,
    registradoPor: r.created_by ? nombres.get(r.created_by) ?? null : null,
  }));

  return <ConsultasGlobal filas={filas} puedeBorrar={puedeUI(usuaria.rol, "consultas", "borrar")} />;
}
