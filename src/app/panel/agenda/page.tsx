import type { Metadata } from "next";
import { requerirUsuaria } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { puedeUI } from "@/lib/permissions";
import { AgendaCliente } from "@/components/agenda/AgendaCliente";
import {
  claveFecha,
  fechaDesdeClave,
  diasDeSemana,
  diasDeMes,
} from "@/lib/agenda";
import type { Cita, Sede, SedeHorario, TipoConsulta, EstadoCita } from "@/types/database";

export const metadata: Metadata = { title: "Agenda" };

export type Vista = "dia" | "semana" | "mes" | "proximas";

export interface CitaConRel extends Cita {
  paciente: {
    id: string;
    nombres: string;
    apellidos: string;
    cedula: string | null;
    telefono: string | null;
    alergias: string | null;
  } | null;
  sede: { id: string; nombre: string; color: string | null; slug: string } | null;
}

export interface PacienteOpcion {
  id: string;
  nombres: string;
  apellidos: string;
  cedula: string | null;
  alergias: string | null;
}

function rango(vista: Vista, ancla: Date): { inicio: string; fin: string } {
  if (vista === "dia") {
    const c = claveFecha(ancla);
    return { inicio: c, fin: c };
  }
  if (vista === "semana") {
    const dias = diasDeSemana(ancla);
    return { inicio: claveFecha(dias[0]!), fin: claveFecha(dias[6]!) };
  }
  // mes: cubrir la rejilla completa (6 semanas)
  const semanas = diasDeMes(ancla);
  return {
    inicio: claveFecha(semanas[0]![0]!),
    fin: claveFecha(semanas[semanas.length - 1]![6]!),
  };
}

const SELECT_CITA =
  "*, paciente:pacientes(id,nombres,apellidos,cedula,telefono,alergias), sede:sedes(id,nombre,color,slug)";

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; fecha?: string; nuevo?: string }>;
}) {
  const usuaria = await requerirUsuaria();
  const supabase = await createClient();

  const sp = await searchParams;
  const vista = (["dia", "semana", "mes", "proximas"].includes(sp.vista ?? "")
    ? sp.vista
    : "semana") as Vista;
  const anclaClave = sp.fecha && /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha) ? sp.fecha : claveFecha(new Date());
  const ancla = fechaDesdeClave(anclaClave);

  // Traer citas del rango (o próximas).
  let citas: CitaConRel[] = [];
  if (vista === "proximas") {
    const hoy = claveFecha(new Date());
    const { data } = await supabase
      .from("citas")
      .select(SELECT_CITA)
      .gte("fecha", hoy)
      .neq("estado", "cancelada")
      .order("fecha", { ascending: true })
      .order("hora_inicio", { ascending: true })
      .limit(100);
    citas = (data as CitaConRel[] | null) ?? [];
  } else {
    const { inicio, fin } = rango(vista, ancla);
    const { data } = await supabase
      .from("citas")
      .select(SELECT_CITA)
      .gte("fecha", inicio)
      .lte("fecha", fin)
      .order("fecha", { ascending: true })
      .order("hora_inicio", { ascending: true });
    citas = (data as CitaConRel[] | null) ?? [];
  }

  const [{ data: sedes }, { data: horarios }, { data: pacientes }] = await Promise.all([
    supabase.from("sedes").select("*").eq("activo", true).order("nombre"),
    supabase.from("sede_horarios").select("*"),
    supabase
      .from("pacientes")
      .select("id, nombres, apellidos, cedula, alergias")
      .eq("activo", true)
      .order("apellidos", { ascending: true })
      .limit(1000),
  ]);

  return (
    <AgendaCliente
      vista={vista}
      anclaClave={anclaClave}
      citas={citas}
      sedes={(sedes as Sede[] | null) ?? []}
      horarios={(horarios as SedeHorario[] | null) ?? []}
      pacientes={(pacientes as PacienteOpcion[] | null) ?? []}
      permisos={{
        crear: puedeUI(usuaria.rol, "agenda", "crear"),
        editar: puedeUI(usuaria.rol, "agenda", "editar"),
        borrar: puedeUI(usuaria.rol, "agenda", "borrar"),
      }}
      puedeCrearConsulta={puedeUI(usuaria.rol, "consultas", "crear")}
      nuevoPacienteId={sp.nuevo && /^[0-9a-f-]{36}$/i.test(sp.nuevo) ? sp.nuevo : undefined}
    />
  );
}

export type { TipoConsulta, EstadoCita };
